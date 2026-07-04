async function getBlobErrorMessage(blob) {
  const text = await blob.text()

  if (!text) {
    return 'Report PDF could not be generated.'
  }

  try {
    const parsed = JSON.parse(text)
    return parsed.detail || parsed.error || parsed.message || text
  } catch {
    return text
  }
}

function createPdfError(message) {
  const error = new Error(message)
  error.response = {
    data: {
      detail: message,
    },
  }
  return error
}

function filenameLabel(params = {}) {
  if (params.period === 'custom') {
    const dateFrom = params.dateFrom || params.date_from || 'custom'
    const dateTo = params.dateTo || params.date_to || 'range'
    return `${dateFrom}_to_${dateTo}`
  }

  return params.period || 'monthly'
}

export async function exportReportPdf(reportsApi, params, onError) {
  try {
    const blob = await reportsApi.downloadReportPDF(params)

    if (blob?.type !== 'application/pdf') {
      throw createPdfError(await getBlobErrorMessage(blob))
    }

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `MediFlow_Financial_Report_${filenameLabel(params)}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    onError?.(error)

    if (!onError) {
      throw error
    }
  }
}
