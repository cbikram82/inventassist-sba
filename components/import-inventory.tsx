"use client"

import type React from "react"

import { useState, useRef } from "react"
import { AlertCircle, Download, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import type { InventoryItem } from "@/types/inventory"
import { addInventoryItem } from "@/app/actions"
import { parseCSVFile, generateTemplateCSV, type ImportResult } from "@/lib/csv-import"

interface ImportInventoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: (items: InventoryItem[]) => void
}

export function ImportInventory({ open, onOpenChange, onImportComplete }: ImportInventoryProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importedItems, setImportedItems] = useState<InventoryItem[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const resetState = () => {
    setFile(null)
    setIsUploading(false)
    setIsProcessing(false)
    setParseResult(null)
    setImportProgress(0)
    setImportedItems([])
    setImportErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if it's a CSV file
      if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file.",
          variant: "destructive",
        })
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        return
      }

      setFile(selectedFile)
      setParseResult(null)
      setImportProgress(0)
      setImportedItems([])
      setImportErrors([])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)

    try {
      const result = await parseCSVFile(file)
      setParseResult(result)

      if (result.errors.length > 0) {
        toast({
          title: "Validation Issues",
          description: `Found ${result.errors.length} issues with the CSV file.`,
          variant: "destructive",
        })
      } else if (result.items.length === 0) {
        toast({
          title: "No Valid Items",
          description: "No valid items found in the CSV file.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "File Validated",
          description: `Found ${result.items.length} valid items ready to import.`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse the CSV file.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return

    setIsProcessing(true)
    setImportProgress(0)
    setImportedItems([])
    setImportErrors([])

    const items = parseResult.items
    const newImportedItems: InventoryItem[] = []
    const newImportErrors: string[] = []

    for (let i = 0; i < items.length; i++) {
      try {
        const { success, item, error } = await addInventoryItem(items[i])

        if (success && item) {
          newImportedItems.push(item)
        } else {
          newImportErrors.push(`Failed to import item "${items[i].name}": ${error}`)
        }
      } catch (error) {
        newImportErrors.push(`Error importing item "${items[i].name}": ${error}`)
      }

      // Update progress
      setImportProgress(Math.round(((i + 1) / items.length) * 100))
    }

    setImportedItems(newImportedItems)
    setImportErrors(newImportErrors)

    if (newImportErrors.length === 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${newImportedItems.length} items.`,
      })
      onImportComplete(newImportedItems)
      setTimeout(() => {
        onOpenChange(false)
        resetState()
      }, 1500)
    } else {
      toast({
        title: "Import Partially Complete",
        description: `Imported ${newImportedItems.length} items with ${newImportErrors.length} errors.`,
        variant: "destructive",
      })
    }

    setIsProcessing(false)
  }

  const handleDownloadTemplate = () => {
    const csvContent = generateTemplateCSV()
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "inventory-template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded.",
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isProcessing) {
          onOpenChange(newOpen)
          if (!newOpen) resetState()
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Inventory Items</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk import inventory items.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={isUploading || isProcessing}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            <div className="text-sm text-muted-foreground">Required columns: Name, Category, Quantity</div>
          </div>

          {!parseResult && (
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                disabled={isUploading || isProcessing}
              />

              {!file ? (
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="mb-2 text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">CSV file (max 5MB)</p>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isProcessing}
                  >
                    Select File
                  </Button>
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-between p-2 bg-muted rounded mb-4">
                    <div className="flex items-center">
                      <div className="ml-2 text-sm font-medium truncate max-w-[300px]">{file.name}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFile(null)}
                      disabled={isUploading || isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    className="w-full bg-sba-red hover:bg-sba-red/90"
                    onClick={handleUpload}
                    disabled={isUploading || isProcessing}
                  >
                    {isUploading ? "Validating..." : "Validate CSV"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {parseResult && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Validation Results</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParseResult(null)
                    setImportProgress(0)
                    setImportedItems([])
                    setImportErrors([])
                  }}
                  disabled={isProcessing}
                >
                  Upload Different File
                </Button>
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between text-sm">
                  <span>Total Rows:</span>
                  <span>{parseResult.totalRows}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valid Items:</span>
                  <span className="font-medium">{parseResult.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Validation Errors:</span>
                  <span className={parseResult.errors.length > 0 ? "text-red-500 font-medium" : ""}>
                    {parseResult.errors.length}
                  </span>
                </div>
              </div>

              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 max-h-[150px] overflow-y-auto text-sm">
                      <ul className="list-disc pl-5 space-y-1">
                        {parseResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {parseResult.errors.length > 10 && <li>...and {parseResult.errors.length - 10} more errors</li>}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Import Progress:</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              {importedItems.length > 0 && (
                <div className="text-sm text-green-600">Successfully imported {importedItems.length} items.</div>
              )}

              {importErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Errors</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 max-h-[150px] overflow-y-auto text-sm">
                      <ul className="list-disc pl-5 space-y-1">
                        {importErrors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importErrors.length > 5 && <li>...and {importErrors.length - 5} more errors</li>}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              resetState()
            }}
            disabled={isUploading || isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isProcessing || importedItems.length > 0}
            className="bg-inventassist-orange hover:bg-inventassist-orange/90"
          >
            {isProcessing ? `Importing (${importProgress}%)` : "Import Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

