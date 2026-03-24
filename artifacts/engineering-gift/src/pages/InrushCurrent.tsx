import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Calculator, Sparkles, Activity } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
import { useSaveCalculation } from "@workspace/api-client-react";

const STANDARD_BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];

export default function InrushCurrent() {
  const [loadType, setLoadType] = useState<"motor"|"transformer"|"led"|"capacitor">("motor");
  const [ratedCurrent, setRatedCurrent] = useState(10);
  const [powerFactor, setPowerFactor] = useState(0.85);
  
  const saveMutation = useSaveCalculation();

  const handleDemo = () => {
    setLoadType("motor");
    setRatedCurrent(15);
    setPowerFactor(0.8);
  };

  const multiplierMap = {
    motor: 7,
    transformer: 10,
    led: 60,
    capacitor: 30
  };

  const results = useMemo(() => {
    const multiplier = multiplierMap[loadType];
    const inrush = ratedCurrent * multiplier;
    
    // Select breaker type based on multiplier logic
    // Type B: 3-5x In, Type C: 5-10x In, Type D: 10-20x In
    let breakerCurve = "Type C";
    if (multiplier < 5) breakerCurve = "Type B";
    else if (multiplier > 10) breakerCurve = "Type D";

    // Find next standard breaker size above rated current
    const suggestedRating = STANDARD_BREAKERS.find(b => b > ratedCurrent) || STANDARD_BREAKERS[STANDARD_BREAKERS.length - 1];

    return {
      inrush: inrush.toFixed(1),
      multiplier: multiplier,
      breakerCurve,
      suggestedRating: `${suggestedRating}A`
    };
  }, [loadType, ratedCurrent]);

  const handleSaveHistory = (projectName: string, engineerName: string) => {
    saveMutation.mutate({
      data: {
        type: "inrush_current",
        projectName,
        engineerName,
        inputs: JSON.stringify({ loadType, ratedCurrent, powerFactor }),
        results: JSON.stringify(results)
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <Activity className="w-6 h-6" />
            </div>
            Inrush Current
          </h1>
          <p className="text-slate-500 mt-1">Estimate peak currents and select breakers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDemo} className="glass-card hover:bg-primary/5">
            <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
            Example Values
          </Button>
          <ExportDialog 
            data={{
              title: "Inrush Current Calculation",
              inputs: { "Load Type": loadType.toUpperCase(), "Rated Current (A)": ratedCurrent, "Power Factor": powerFactor },
              results: { "Est. Inrush (A)": results.inrush, "Multiplier used": `${results.multiplier}x`, "Suggested Curve": results.breakerCurve, "Min Breaker Size": results.suggestedRating },
              formula: "Inrush Current = Rated Current × Load Multiplier"
            }}
            onSaveHistory={handleSaveHistory}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 glass-card shadow-lg border-0">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl border-b border-border">
            <CardTitle className="text-lg">Load Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Equipment Load Type</Label>
              <Select value={loadType} onValueChange={(v: any) => setLoadType(v)}>
                <SelectTrigger className="bg-white/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motor">Induction Motor (DOL)</SelectItem>
                  <SelectItem value="transformer">Transformer</SelectItem>
                  <SelectItem value="led">LED Lighting (Driver)</SelectItem>
                  <SelectItem value="capacitor">Capacitor Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Nominal Rated Current (A)
                <Tooltip><TooltipTrigger><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger><TooltipContent>Steady-state operating current</TooltipContent></Tooltip>
              </Label>
              <Input type="number" value={ratedCurrent} onChange={e => setRatedCurrent(Number(e.target.value) || 0)} className="bg-white/50" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Power Factor
                <Tooltip><TooltipTrigger><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger><TooltipContent>Only for reference in report</TooltipContent></Tooltip>
              </Label>
              <Input type="number" step="0.01" max="1" min="0" value={powerFactor} onChange={e => setPowerFactor(Number(e.target.value) || 0)} className="bg-white/50" />
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mt-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Rule of Thumb Multipliers:</p>
              <ul className="space-y-1 list-disc list-inside ml-2">
                <li>Motor: ~6-8x</li>
                <li>Transformer: ~8-12x</li>
                <li>LED Drivers: ~50-100x (very short duration)</li>
                <li>Capacitors: ~20-50x</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-7 space-y-6">
          <Card className="glass-card shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-500" /> Circuit Breaker Selection
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-500 mb-1">Estimated Inrush Current</p>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-display font-bold text-orange-500">{results.inrush}</p>
                    <span className="text-2xl text-slate-400 font-bold mb-1">A</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Based on {results.multiplier}x multiplier</p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 mb-1">Suggested Breaker Size</p>
                    <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">{results.suggestedRating}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 mb-1">Tripping Curve</p>
                    <p className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400">{results.breakerCurve}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50">
                <p className="text-sm font-mono text-orange-800 dark:text-orange-300">
                  <strong>Logic:</strong> Inrush = Nominal × Multiplier.<br/>
                  Curve selection: Type B (&lt;5x), Type C (5-10x), Type D (&gt;10x).<br/>
                  Size is the next standard rating above {ratedCurrent}A.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
