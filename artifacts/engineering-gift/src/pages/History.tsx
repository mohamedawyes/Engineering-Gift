import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Trash2, Calendar, FileText, Download } from "lucide-react";
import { useGetCalculations, useDeleteCalculation } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToPDF, exportToExcel } from "@/lib/export";

export default function History() {
  const { data: history, isLoading } = useGetCalculations();
  const deleteMutation = useDeleteCalculation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/calculations"] });
        toast({ title: "Deleted", description: "History record removed." });
      }
    });
  };

  const handleExport = (record: any, type: 'pdf'|'excel') => {
    try {
      const parsedInputs = JSON.parse(record.inputs);
      const parsedResults = JSON.parse(record.results);
      
      const exportData = {
        title: record.type.replace('_', ' ').toUpperCase(),
        projectName: record.projectName,
        engineerName: record.engineerName,
        inputs: parsedInputs,
        results: parsedResults
      };

      if (type === 'pdf') exportToPDF(exportData);
      else exportToExcel(exportData);
    } catch (e) {
      toast({ title: "Error", description: "Failed to parse historical data.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              <BookOpen className="w-6 h-6" />
            </div>
            Calculation History
          </h1>
          <p className="text-slate-500 mt-1">Review and re-export past engineering calculations.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="glass-card shadow-lg border-0"><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="py-20 text-center glass-card rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No history found</h3>
          <p className="text-slate-500 mt-2">Calculations you save will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((record) => {
            const parsedResults = JSON.parse(record.results || "{}");
            const parsedInputs = JSON.parse(record.inputs || "{}");
            
            return (
              <Card key={record.id} className="glass-card shadow-lg border border-slate-200/50 dark:border-white/5 hover:shadow-xl transition-all group">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg capitalize text-primary">{record.type.replace('_', ' ')}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(record.createdAt), "MMM d, yyyy • HH:mm")}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(record.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8 -mt-2 -mr-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {record.projectName && <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Project: {record.projectName}</p>}
                    {record.engineerName && <p className="text-sm text-slate-500">Eng: {record.engineerName}</p>}
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-sm space-y-2 border border-slate-100 dark:border-slate-800">
                    <p className="font-semibold border-b border-border/50 pb-1 mb-1 text-slate-700 dark:text-slate-300">Key Results:</p>
                    {Object.entries(parsedResults).slice(0, 3).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{String(v)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleExport(record, 'pdf')}>
                      <Download className="w-3 h-3 mr-1" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleExport(record, 'excel')}>
                      <Download className="w-3 h-3 mr-1" /> Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
