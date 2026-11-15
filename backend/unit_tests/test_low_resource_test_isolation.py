import importlib.util
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest


ROOT = Path(__file__).resolve().parents[2]


def load_script(name, relative_path):
    path = ROOT / relative_path
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


prepare = load_script('prepare_low_resource', Path('scripts/prepare-low-resource.py'))
seed = load_script('low_resource_seed', Path('backend/tests/low_resource_seed.py'))
benchmark = load_script('low_resource_benchmark', Path('scripts/low-resource-benchmark.py'))


def test_normal_and_test_profiles_use_distinct_database_project_and_ports():
    normal = prepare.profile_defaults(False)
    test = prepare.profile_defaults(True)

    assert normal['MYSQL_DATABASE'] == 'comgraf_lan'
    assert normal['TEST_MYSQL_DATABASE'].endswith('_test')
    assert normal['LOW_RESOURCE_PROJECT_NAME'] == 'comgraf-lan-light'
    assert test['MYSQL_DATABASE'] == test['TEST_MYSQL_DATABASE'] == 'comgraf_lan_test'
    assert test['LOW_RESOURCE_PROJECT_NAME'] == 'comgraf-lan-light-test'
    assert test['HTTPS_PORT'] != normal['HTTPS_PORT']
    assert test['HTTP_PORT'] != normal['HTTP_PORT']


def test_test_mode_rejects_runtime_paths_outside_disposable_root(tmp_path):
    mysql = prepare.TEST_ROOT / 'mysql'
    app = prepare.TEST_ROOT / 'app'

    with pytest.raises(SystemExit, match='runtime'):
        prepare.require_test_paths(mysql, app, tmp_path / '.runtime' / 'low-resource')


def test_test_mode_rejects_overlapping_mysql_app_and_runtime_directories(tmp_path):
    shared = tmp_path / 'isolated'

    with pytest.raises(SystemExit, match='directorios separados'):
        prepare.require_separate_paths(shared / 'mysql', shared / 'app', shared / 'mysql' / 'runtime')


def test_seed_refuses_a_test_suffixed_operational_profile():
    with pytest.raises(SystemExit, match='LOW_RESOURCE_TEST_MODE'):
        seed.require_test_profile('comgraf_lan_test', '0', 'comgraf-lan-light-test')


def test_seed_requires_test_database_even_with_explicit_test_mode():
    with pytest.raises(SystemExit, match='MYSQL_DATABASE'):
        seed.require_test_profile('comgraf_lan', '1', 'comgraf-lan-light-test')


def test_seed_allows_only_explicit_isolated_test_profile():
    seed.require_test_profile('comgraf_lan_test', '1', 'comgraf-lan-light-test')


def test_seed_refuses_normal_compose_project_even_if_test_flag_is_set():
    with pytest.raises(SystemExit, match='LOW_RESOURCE_PROJECT_NAME'):
        seed.require_test_profile('comgraf_lan_test', '1', 'comgraf-lan-light')


def test_integration_suite_refuses_the_operational_database_without_isolated_profile():
    environment = os.environ.copy()
    environment.update({
        'MYSQL_DATABASE': 'comgraf_lan_test',
        'TEST_MYSQL_DATABASE': 'comgraf_lan_test',
        'LOW_RESOURCE_TEST_MODE': '0',
    })
    result = subprocess.run(
        [sys.executable, '-m', 'pytest', '--collect-only', 'tests/test_workflows.py', '-q'],
        cwd=ROOT / 'backend',
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )

    assert result.returncode != 0
    assert 'inicia el perfil aislado de pruebas' in result.stdout + result.stderr


def test_benchmark_targets_the_named_test_compose_project():
    with patch.object(benchmark.subprocess, 'run') as run:
        run.return_value = SimpleNamespace(returncode=0, stdout='test-db-1\n')

        assert benchmark.docker_project_containers('comgraf-lan-light-test') == ['test-db-1']
        assert 'label=com.docker.compose.project=comgraf-lan-light-test' in run.call_args.args[0]

        run.return_value = SimpleNamespace(returncode=1, stdout='')
        benchmark.mysql_status('comgraf-lan-light-test')
        assert run.call_args.args[0][2] == 'comgraf-lan-light-test-db-1'
