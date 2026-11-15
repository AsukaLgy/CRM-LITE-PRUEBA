import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, money, uid } from './api'
import { ErrorBox, Field, FormDialog, RadioGroup, Select } from './components'
import { ClientAutocomplete } from './NewCase'
import { ItemsEditor, cleanItems, newItem, validateFiscalDocumentTypes } from './ProductForm'
import {
  DEFAULT_DELIVERY_METHOD,
  DELIVERY_METHOD_OPTIONS,
  PAYMENT_TERMS,
  PAYMENT_TERM_OPTIONS,
} from './domain'

export default function NewProductionRequest({ user, onClose }) {
  const navigate = useNavigate(),
    qc = useQueryClient(),
    idempotency = useRef({ key: uid(), signature: '' }),
    [created, setCreated] = useState(null),
    [advancing, setAdvancing] = useState(false),
    [advanceError, setAdvanceError] = useState(null)
  const initial = {
    client_id: '',
    subject: '',
    priority: 'Normal',
    description: '',
    items: [newItem()],
    requested_date: '',
    committed_date: '',
    payment_terms: PAYMENT_TERMS[0],
    advance_required: '0',
    payment_due_date: '',
    delivery_method: DEFAULT_DELIVERY_METHOD,
    instructions: '',
    quote_id: '',
  }
  const orders = created?.productions?.length
    ? created.productions
    : created?.production
      ? [created.production]
      : []

  async function save(v) {
    if (!v.client_id) throw new Error('Selecciona un cliente antes de guardar.')
    if (!v.subject.trim()) throw new Error('Escribe el asunto de la solicitud.')
    if (!v.items.length) throw new Error('Agrega al menos un producto.')
    validateFiscalDocumentTypes(v.items)
    const body = {
      ...v,
      client_id: Number(v.client_id),
      priority: v.priority,
      currency: 'HNL',
      quote_id: null,
      items: cleanItems(v.items),
      requested_date: v.requested_date || null,
      committed_date: v.committed_date || null,
      advance_required: String(v.advance_required || '0'),
      payment_due_date: v.payment_due_date || null,
    }
    const signature = JSON.stringify(body)
    if (idempotency.current.signature && idempotency.current.signature !== signature)
      idempotency.current.key = uid()
    idempotency.current.signature = signature
    const result = await api('/production-requests', {
      method: 'POST',
      body: { ...body, version: 1, key: idempotency.current.key },
    })
    setCreated(result)
    void qc.invalidateQueries().catch(() => {})
    return false
  }
  async function finish(advance) {
    if (!created || advancing) return
    if (advance) {
      setAdvancing(true)
      setAdvanceError(null)
      try {
        let current = await api(`/cases/${created.id}`)
        for (const order of current.productions || []) {
          if (order.stage !== 'APPROVAL') continue
          current = await api(`/cases/${created.id}/production/stage`, {
            method: 'POST',
            body: {
              production_id: order.id,
              stage: 'PRINTING',
              version: current.version,
              key: uid(),
            },
          })
        }
        await qc.invalidateQueries()
      } catch (error) {
        setAdvanceError(error)
        setAdvancing(false)
        return
      }
    }
    navigate(`/cases/${created.id}?tab=production&production_id=${created.production.id}`)
    onClose()
  }
  return (
    <FormDialog
      wide
      title="Generar orden de producción"
      submit="Crear solicitud y orden"
      initial={initial}
      onClose={onClose}
      onSave={save}
      afterSave={() => (
        <div className="dialog-body">
          <div className="notice">
            <strong>
              {orders.length > 1
                ? `${orders.length} \u00f3rdenes creadas en Aprobaci\u00f3n.`
                : 'Orden creada en Aprobaci\u00f3n.'}
            </strong>
            <p>
              {orders.length > 1
                ? '\u00bfQuer\u00e9s pasar todas a Impresi\u00f3n ahora?'
                : '\u00bfQuer\u00e9s pasarla a Impresi\u00f3n ahora?'}
            </p>
            <small>
              Eleg&iacute; esta opci&oacute;n si el trabajo ya est&aacute; aprobado y
              comenzar&aacute; a imprimirse.
            </small>
          </div>
          <p>
            {orders.length}{' '}
            {orders.length === 1 ? 'OP qued\u00f3 guardada' : 'OP quedaron guardadas'} en la misma
            solicitud.
          </p>
          <ul>
            {orders.map((order) => (
              <li key={order.id}>
                <strong>{order.order_number}</strong>
                {' \u00b7 '}
                <a href={`/cases/${created.id}?tab=production&production_id=${order.id}`}>
                  Consultar
                </a>
                {' \u00b7 '}
                <a
                  href={`/cases/${created.id}/print?production_id=${order.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Imprimir
                </a>
              </li>
            ))}
          </ul>
          <ErrorBox error={advanceError} />
          <div className="actions">
            <button type="button" disabled={advancing} onClick={() => finish(false)}>
              Mantener en Aprobaci\u00f3n
            </button>
            <button
              type="button"
              className="primary"
              disabled={advancing}
              onClick={() => finish(true)}
            >
              {advancing
                ? 'Actualizando\u2026'
                : orders.length > 1
                  ? 'Pasar todas a Impresi\u00f3n'
                  : 'Pasar a Impresi\u00f3n'}
            </button>
          </div>
        </div>
      )}
      render={(v, set) => (
        <>
          <section className="integrated-create-section">
            <h3>Cliente y solicitud</h3>
            <div className="form-grid">
              <ClientAutocomplete
                id="production-client"
                searchEndpoint="/production-clients"
                user={user}
                selectedId={v.client_id}
                onSelect={(client) => set('client_id', String(client.id))}
                onClear={() => set('client_id', '')}
              />
              <Field
                label="Asunto"
                required
                value={v.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
              <Select
                label="Prioridad"
                options={['Baja', 'Normal', 'Alta', 'Urgente']}
                value={v.priority}
                onChange={(e) => set('priority', e.target.value)}
              />
              <Field label="Descripción (opcional)" className="full">
                <textarea
                  rows={3}
                  value={v.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
            </div>
          </section>
          <section className="integrated-create-section">
            <h3>Trabajo a producir</h3>
            <ItemsEditor items={v.items} onChange={(items) => set('items', items)} />
            <div className="form-grid">
              <Field
                label="Fecha solicitada"
                type="date"
                value={v.requested_date}
                onChange={(e) => set('requested_date', e.target.value)}
              />
              <Field
                label="Fecha comprometida"
                type="date"
                value={v.committed_date}
                onChange={(e) => set('committed_date', e.target.value)}
              />
              <RadioGroup
                label="Condición de pago"
                required
                options={PAYMENT_TERM_OPTIONS}
                value={v.payment_terms}
                onChange={(value) => set('payment_terms', value)}
              />
              <Field
                label="Anticipo requerido (HNL)"
                type="number"
                min="0"
                step="0.01"
                required
                value={v.advance_required}
                onChange={(e) => set('advance_required', e.target.value)}
              />
              <Field
                label="Vencimiento del saldo (si está acordado)"
                type="date"
                value={v.payment_due_date}
                onChange={(e) => set('payment_due_date', e.target.value)}
              />
              <RadioGroup
                label="Modalidad de entrega"
                required
                options={DELIVERY_METHOD_OPTIONS}
                value={v.delivery_method}
                onChange={(value) => set('delivery_method', value)}
              />
              <Field label="Instrucciones de taller" className="full">
                <textarea
                  rows={3}
                  value={v.instructions}
                  onChange={(e) => set('instructions', e.target.value)}
                />
              </Field>
            </div>
            <p className="total">
              Total estimado{' '}
              <strong>
                {money(
                  v.items.reduce(
                    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
                    0,
                  ),
                  'HNL',
                )}
              </strong>
            </p>
          </section>
        </>
      )}
    />
  )
}
