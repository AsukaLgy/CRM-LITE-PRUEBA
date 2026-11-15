"""Prepare a separate LAN-light runtime. Generates new credentials, never imports .env."""
import argparse
import os
from pathlib import Path
import secrets
import shutil
import subprocess

REPO = Path(__file__).resolve().parents[1]
DEFAULT_RUNTIME = REPO / '.runtime' / 'low-resource'
TEST_ROOT = REPO / '.runtime' / 'lan-light-test-data'
REMOTE_FS = {'cifs', 'smb3', 'nfs', 'nfs4', 'sshfs', '9p'}


def profile_defaults(test_mode: bool) -> dict[str, str]:
    """Keep a normal installation distinct from its destructive test profile."""
    if test_mode:
        return {
            'LOW_RESOURCE_PROJECT_NAME': 'comgraf-lan-light-test',
            'MYSQL_DATABASE': 'comgraf_lan_test',
            'TEST_MYSQL_DATABASE': 'comgraf_lan_test',
            'HTTPS_PORT': '28443',
            'HTTP_PORT': '28080',
        }
    return {
        'LOW_RESOURCE_PROJECT_NAME': 'comgraf-lan-light',
        'MYSQL_DATABASE': 'comgraf_lan',
        'TEST_MYSQL_DATABASE': 'comgraf_test',
        'HTTPS_PORT': '18443',
        'HTTP_PORT': '18080',
    }


def require_test_paths(mysql_dir: Path, app_dir: Path, runtime_dir: Path) -> None:
    root = TEST_ROOT.resolve()
    for label, path in (('MySQL', mysql_dir), ('aplicación', app_dir), ('runtime', runtime_dir)):
        try:
            path.resolve().relative_to(root)
        except ValueError as exc:
            raise SystemExit(f'--test-mode solo acepta rutas de {label} bajo {root}; no apunta a una instalación real.') from exc


def require_separate_paths(mysql_dir: Path, app_dir: Path, runtime_dir: Path) -> None:
    paths = (mysql_dir, app_dir, runtime_dir)
    for index, path in enumerate(paths):
        if any(path == other or path in other.parents or other in path.parents for other in paths[index + 1:]):
            raise SystemExit('MySQL, aplicación y runtime deben usar directorios separados.')


def filesystem(path: Path):
    if not shutil.which('findmnt'):
        raise SystemExit('Se requiere findmnt (util-linux) para validar el almacenamiento; no se instaló nada.')
    probe = path
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    result = subprocess.run(
        ['findmnt', '-n', '-o', 'TARGET,FSTYPE,SOURCE', '-T', str(probe)],
        check=False, text=True, capture_output=True,
    )
    if result.returncode:
        raise SystemExit(f'No se pudo verificar el montaje de {path}: {result.stderr.strip()}')
    fields = result.stdout.strip().split(None, 2)
    if len(fields) < 2:
        raise SystemExit(f'findmnt no devolvió sistema de archivos para {path}')
    return fields[0], fields[1]


def require_local(path: Path, *, test_mode: bool, require_mount: bool):
    target, fstype = filesystem(path)
    if fstype.lower() in REMOTE_FS or fstype.lower().startswith('fuse.ssh'):
        raise SystemExit(f'{path} está en {fstype}; MySQL y datos de prueba requieren almacenamiento local, no SMB/NFS.')
    if require_mount and not test_mode and target == '/':
        raise SystemExit(f'{path} está en el sistema de archivos raíz. Monta primero el disco local de MySQL; no se creó ningún dato.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mysql-data-dir', required=True, type=Path, help='Directorio dedicado en un montaje local para MySQL')
    parser.add_argument('--app-data-dir', required=True, type=Path, help='Directorio dedicado para adjuntos, secretos, registros y respaldos')
    parser.add_argument('--runtime-dir', type=Path, default=DEFAULT_RUNTIME)
    parser.add_argument('--test-mode', action='store_true', help='Permite usar disco local del sistema solo para esta base de pruebas')
    args = parser.parse_args()

    mysql_dir = args.mysql_data_dir.expanduser().resolve()
    app_dir = args.app_data_dir.expanduser().resolve()
    runtime_dir = args.runtime_dir.expanduser().resolve()
    require_separate_paths(mysql_dir, app_dir, runtime_dir)
    if mysql_dir.exists() and any(mysql_dir.iterdir()):
        raise SystemExit(f'{mysql_dir} no está vacío; no se reutiliza ni modifica un directorio de datos existente.')
    if runtime_dir.exists() and any(runtime_dir.iterdir()):
        raise SystemExit(f'{runtime_dir} ya contiene archivos; no se sobrescribió nada.')
    if args.test_mode:
        require_test_paths(mysql_dir, app_dir, runtime_dir)
    else:
        require_local(mysql_dir, test_mode=False, require_mount=True)
        require_local(app_dir, test_mode=False, require_mount=False)

    runtime_dir.mkdir(parents=True, mode=0o700)
    for child in ('uploads', 'test-uploads', 'mail-secrets', 'logs/app', 'logs/mysql', 'backups'):
        (app_dir / child).mkdir(parents=True, exist_ok=True)
    mysql_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(runtime_dir, 0o700)

    values = {
        'LOW_RESOURCE_TEST_MODE': '1' if args.test_mode else '0',
        'MYSQL_DATA_DIR': str(mysql_dir),
        'APP_DATA_DIR': str(app_dir),
        'APP_UID': str(os.getuid()),
        'APP_GID': str(os.getgid()),
        'MYSQL_USER': 'comgraf_lan',
        'MYSQL_PASSWORD': secrets.token_hex(32),
        'MYSQL_ROOT_PASSWORD': secrets.token_hex(32),
        'HTTPS_BIND': '127.0.0.1',
        'HTTPS_HOST': 'localhost',
        **profile_defaults(args.test_mode),
    }
    env_file = runtime_dir / '.env'
    env_file.write_text(''.join(f'{key}={value}\n' for key, value in values.items()), encoding='utf-8')
    os.chmod(env_file, 0o600)
    print(f'Perfil aislado preparado: {env_file}')
    print(f'MySQL: {mysql_dir}')
    print(f'Datos Comgraf: {app_dir}')
    print('Se generaron credenciales nuevas; no se copiaron .env, certificados ni secretos existentes.')
    print('El correo queda sin configurar. No se envían mensajes externos.')
    print('Para enlazar a la LAN, edita HTTPS_BIND y HTTPS_HOST en ese .env; el valor inicial solo escucha en localhost.')


if __name__ == '__main__':
    main()
