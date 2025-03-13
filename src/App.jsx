import { useState } from 'react'
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import candidatesData from './assets/candidates.json'
import * as XLSX from 'xlsx'

function App() {
  const [formData, setFormData] = useState({
    territory: '',
    municipio: '',
    centro: '',
    colonia: '',
    jrv: '',
  })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}
    
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = `Por favor ingrese ${key === 'jrv' ? 'el número de JRV' : key}`
      }
    })
    
    if (!file) {
      newErrors.file = 'Por favor seleccione un archivo JSON'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const generateExcel = (processedData, formData) => {
    // Create a map to store marks by position
    const marksByPosition = new Map()
    processedData.forEach(item => {
      if (item.posicion !== 'No encontrado') {
        marksByPosition.set(Number(item.posicion), item.marcas)
      }
    })

    // Create the row data with fixed columns first
    const rowData = {
      'No. Acta': formData.jrv,
      'CENTRO DE VOTACION': formData.centro,
      'COLONIA': formData.colonia,
      'TERRITORIO': formData.territory,
    }

    // Add positions as columns (1 to max position in candidates.json)
    const maxPosition = Math.max(...candidatesData.map(c => c.position))
    for (let i = 1; i <= maxPosition; i++) {
      rowData[i.toString()] = marksByPosition.get(i) || '0'
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet([rowData], {
      header: ['No. Acta', 'CENTRO DE VOTACION', 'COLONIA', 'TERRITORIO', 
        ...Array.from({length: maxPosition}, (_, i) => (i + 1).toString())]
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados')

    // Generate filename from input values
    const filename = `${formData.territory}-${formData.municipio}-${formData.centro}-${formData.colonia}-${formData.jrv}`
      .replace(/[^a-zA-Z0-9-]/g, '') // Remove special characters except hyphen
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      + '.xlsx'

    // Generate Excel file
    XLSX.writeFile(wb, filename)
  }

  const processJsonData = async (jsonData) => {
    const candidatesMap = new Map(
      candidatesData.map(candidate => [candidate.name, candidate.position])
    )

    const processedData = jsonData.resultados.map(item => ({
      ...item,
      posicion: candidatesMap.get(item.candidato) || 'No encontrado'
    }))

    // Sort by position (ascending)
    processedData.sort((a, b) => {
      if (a.posicion === 'No encontrado') return 1
      if (b.posicion === 'No encontrado') return -1
      return Number(a.posicion) - Number(b.posicion)
    })

    console.log('Datos procesados y ordenados:', processedData)
    return processedData
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    setErrors({})

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (selectedFile.type !== 'application/json') {
      setErrors({ file: 'Por favor seleccione un archivo JSON válido' })
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const fileContent = await file.text()
      const jsonData = JSON.parse(fileContent)
      const processedData = await processJsonData(jsonData)
      generateExcel(processedData, formData)
    } catch (error) {
      console.error('Error al procesar el archivo:', error)
      setErrors({ file: 'Error al procesar el archivo JSON' })
    }
  }

  const isFormValid = Object.values(formData).every(value => value.trim()) && file

  const renderInput = (name, label, placeholder) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">
        <input
          id={name}
          name={name}
          type="text"
          required
          value={formData[name]}
          onChange={handleInputChange}
          className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200 ${
            errors[name] ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={placeholder}
        />
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors[name]}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 bg-gray-50">
        <main className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl">
            <div className="bg-white shadow-2xl rounded-xl p-6 sm:p-8 lg:p-10">
              <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-8">
                JSON a Excel
              </h2>

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {renderInput('territory', 'Territorio', 'Ejemplo: 12')}
                  {renderInput('municipio', 'Municipio', 'Ejemplo: Distrito Central')}
                  {renderInput('centro', 'Centro', 'Ejemplo: Instituto Central Vicente Cáceres')}
                  {renderInput('colonia', 'Colonia', 'Ejemplo: Col. Tiloarque No. 1')}
                  {renderInput('jrv', 'Número de JRV', 'Ejemplo: 2507')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Archivo JSON
                  </label>
                  <label 
                    htmlFor="file"
                    className={`mt-1 flex justify-center w-full h-64 border-2 border-dashed rounded-md hover:border-indigo-500 transition-colors duration-200 cursor-pointer ${
                      errors.file ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <div className="w-full flex flex-col items-center justify-center">
                      <DocumentArrowUpIcon className={`mx-auto h-12 w-12 ${
                        errors.file ? 'text-red-400' : 'text-gray-400'
                      }`} />
                      <span className="mt-2 block text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        Seleccionar archivo
                      </span>
                      <input
                        id="file"
                        name="file"
                        type="file"
                        required
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                      <p className="mt-1 text-xs text-gray-500">Solo archivos JSON</p>
                      {file && (
                        <p className="mt-2 text-sm text-green-600 font-medium">
                          Archivo seleccionado: {file.name}
                        </p>
                      )}
                      {errors.file && (
                        <p className="mt-2 text-sm text-red-600" role="alert">
                          {errors.file}
                        </p>
                      )}
                    </div>
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                  >
                    Procesar Archivo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
