import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Flame, Battery, Cable, Plus, Trash2, Copy, ChevronDown, ChevronUp, 
  Settings2, Download, FileText, FileSpreadsheet, AlertTriangle, CheckCircle2,
  AlertCircle, Save, Upload, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brands, Brand, Panel, Device } from "@/lib/fireAlarmData";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// --- TYPES ---
interface LoopDevice {
  id: string;
  deviceId: string;
  customName?: string;
  customCurrentMA?: number;
  customAlarmCurrentMA?: number;
  quantity: number;
}

interface Loop {
  id: string;
  name: string;
  cableLength: number;
  cableSizeMM2: number;
  cableMaterial: "cu" | "al";
  devices: LoopDevice[];
  expanded: boolean;
}

interface ProjectInfo {
  name: string;
  engineer: string;
  client: string;
  date: string;
}

// --- HELPER FUNCTIONS ---
function createDefaultLoop(num: number): Loop {
  return { 
    id: crypto.randomUUID(), 
    name: `Loop ${num}`, 
    cableLength: 1000, 
    cableSizeMM2: 1.5, 
    cableMaterial: "cu", 
    devices: [],
    expanded: true
  };
}

const BATTERY_SIZES = [7, 12, 17, 24, 38, 65, 100];
function getRecommendedBattery(calcAh: number): number {
  return BATTERY_SIZES.find(size => size >= calcAh) || BATTERY_SIZES[BATTERY_SIZES.length - 1];
}

// --- MAIN COMPONENT ---
export default function FireAlarm() {
  const { toast } = useToast();
  
  // App State
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ 
    name: "", engineer: "", client: "", date: new Date().toLocaleDateString() 
  });
  const [selectedBrandId, setSelectedBrandId] = useState(brands[0].id);
  const [selectedPanelId, setSelectedPanelId] = useState(brands[0].panels[0]?.id || "");
  const [loops, setLoops] = useState<Loop[]>([createDefaultLoop(1)]);
  const [standbyHours, setStandbyHours] = useState(24);
  const [alarmMinutes, setAlarmMinutes] = useState(30);
  const [language, setLanguage] = useState<"en" | "ar">("en");

  // Derived Data
  const currentBrand = useMemo(() => brands.find(b => b.id === selectedBrandId) || brands[0], [selectedBrandId]);
  const currentPanel = useMemo(() => currentBrand.panels.find(p => p.id === selectedPanelId) || currentBrand.panels[0], [currentBrand, selectedPanelId]);

  // Calculations per Loop
  const loopCalculations = useMemo(() => {
    return loops.map(loop => {
      let standbyCurrentMA = 0;
      let alarmCurrentMA = 0;
      let totalDevices = 0;
      let detectorsCount = 0;
      let soundersCount = 0;
      let callpointsCount = 0;
      let modulesCount = 0;

      loop.devices.forEach(ld => {
        let current = 0;
        let alarm = 0;
        
        if (ld.deviceId === "custom") {
          current = ld.customCurrentMA || 0;
          alarm = ld.customAlarmCurrentMA || 0;
        } else {
          const device = currentBrand.devices.find(d => d.id === ld.deviceId);
          if (device) {
            current = device.currentMA;
            alarm = device.alarmCurrentMA;
            if (device.type === 'detector') detectorsCount += ld.quantity;
            if (device.type === 'sounder') soundersCount += ld.quantity;
            if (device.type === 'callpoint') callpointsCount += ld.quantity;
            if (device.type === 'module') modulesCount += ld.quantity;
          }
        }
        
        standbyCurrentMA += (current * ld.quantity);
        alarmCurrentMA += (alarm * ld.quantity);
        totalDevices += ld.quantity;
      });

      const rho = loop.cableMaterial === "cu" ? 0.0175 : 0.028;
      const loopResistance = (2 * loop.cableLength * rho) / loop.cableSizeMM2;
      const voltageDrop = (alarmCurrentMA / 1000) * loopResistance;
      const nominalVolt = currentPanel?.nominalVoltage || 24;
      const voltageDropPct = nominalVolt > 0 ? (voltageDrop / nominalVolt) * 100 : 0;
      const endVoltage = nominalVolt - voltageDrop;
      
      let status = "safe";
      if (voltageDropPct > 10) status = "danger";
      else if (voltageDropPct > 5) status = "warning";

      const maxDevicesReached = currentPanel && totalDevices >= currentPanel.maxDevicesPerLoop;

      return {
        ...loop,
        standbyCurrentMA,
        alarmCurrentMA,
        totalDevices,
        detectorsCount,
        soundersCount,
        callpointsCount,
        modulesCount,
        loopResistance,
        voltageDrop,
        voltageDropPct,
        endVoltage,
        status,
        maxDevicesReached
      };
    });
  }, [loops, currentBrand, currentPanel]);

  // System & Battery Calculations
  const systemCalculations = useMemo(() => {
    let totalStandbyMA = 80; // Panel quiescent baseline
    let totalAlarmMA = 500; // Panel alarm baseline (sounders, bells, relays)

    loopCalculations.forEach(calc => {
      totalStandbyMA += calc.standbyCurrentMA;
      totalAlarmMA += calc.alarmCurrentMA;
    });

    let batteryAh = (totalStandbyMA * standbyHours + totalAlarmMA * (alarmMinutes / 60)) / 1000;
    batteryAh *= 1.25; // 25% safety factor
    
    return {
      totalStandbyMA,
      totalAlarmMA,
      batteryAh,
      recommendedBattery: getRecommendedBattery(batteryAh)
    };
  }, [loopCalculations, standbyHours, alarmMinutes]);

  // Handlers
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find(b => b.id === brandId);
    if (brand && brand.panels.length > 0) {
      setSelectedPanelId(brand.panels[0].id);
    } else {
      setSelectedPanelId("");
    }
  };

  const handleAddLoop = () => {
    if (!currentPanel || loops.length >= currentPanel.maxLoops) return;
    setLoops([...loops, createDefaultLoop(loops.length + 1)]);
  };

  const handleDeleteLoop = (id: string) => {
    if (loops.length <= 1) return;
    setLoops(loops.filter(l => l.id !== id));
  };

  const handleDuplicateLoop = (loopToClone: Loop) => {
    if (!currentPanel || loops.length >= currentPanel.maxLoops) {
      toast({ title: "Max Loops Reached", description: `Panel supports max ${currentPanel?.maxLoops || 0} loops.`, variant: "destructive" });
      return;
    }
    const newLoop = { 
      ...loopToClone, 
      id: crypto.randomUUID(), 
      name: `${loopToClone.name} (Copy)` 
    };
    setLoops([...loops, newLoop]);
  };

  const toggleLoopExpand = (id: string) => {
    setLoops(loops.map(l => l.id === id ? { ...l, expanded: !l.expanded } : l));
  };

  const handleUpdateLoop = (id: string, updates: Partial<Loop>) => {
    setLoops(loops.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleAddDevice = (loopId: string) => {
    const loop = loops.find(l => l.id === loopId);
    if (!loop) return;

    const calc = loopCalculations.find(c => c.id === loopId);
    if (currentPanel && calc && calc.totalDevices >= currentPanel.maxDevicesPerLoop) {
      toast({ title: "Warning", description: "Maximum devices per loop reached for this panel.", variant: "destructive" });
      return; // Still allow adding, but show warning
    }

    const newDevice: LoopDevice = {
      id: crypto.randomUUID(),
      deviceId: currentBrand.devices[0]?.id || "custom",
      quantity: 1,
    };
    handleUpdateLoop(loopId, { devices: [...loop.devices, newDevice] });
  };

  const handleUpdateDevice = (loopId: string, deviceId: string, updates: Partial<LoopDevice>) => {
    setLoops(loops.map(l => {
      if (l.id !== loopId) return l;
      return {
        ...l,
        devices: l.devices.map(d => d.id === deviceId ? { ...d, ...updates } : d)
      };
    }));
  };

  const handleDeleteDevice = (loopId: string, deviceId: string) => {
    setLoops(loops.map(l => {
      if (l.id !== loopId) return l;
      return { ...l, devices: l.devices.filter(d => d.id !== deviceId) };
    }));
  };

  const t = (en: string, ar: string) => language === "en" ? en : ar;

  // Exports
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(0, 112, 243);
      doc.text("Engineering Gift", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Fire Alarm LSN Voltage Drop & Battery Report", 14, 26);
      doc.line(14, 30, 196, 30);
      
      // Project Info
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.text(`Project: ${projectInfo.name || 'N/A'}`, 14, 40);
      doc.text(`Engineer: ${projectInfo.engineer || 'N/A'}`, 14, 46);
      doc.text(`Client: ${projectInfo.client || 'N/A'}`, 14, 52);
      doc.text(`Date: ${projectInfo.date}`, 14, 58);
      
      doc.text(`Brand: ${currentBrand?.name} | Panel: ${currentPanel?.name}`, 14, 66);
      
      // Loops Summary
      let yPos = 74;
      doc.text("System Loops Summary", 14, yPos);
      yPos += 4;
      
      const loopsData = loopCalculations.map(l => [
        l.name,
        l.totalDevices.toString(),
        `${l.standbyCurrentMA.toFixed(1)} mA`,
        `${l.alarmCurrentMA.toFixed(1)} mA`,
        `${l.voltageDrop.toFixed(2)} V`,
        `${l.voltageDropPct.toFixed(1)}%`,
        `${l.endVoltage.toFixed(2)} V`,
        l.status.toUpperCase()
      ]);
      
      // @ts-ignore
      doc.autoTable({
        startY: yPos,
        head: [['Loop', 'Devices', 'Standby', 'Alarm', 'VDrop (V)', 'VDrop %', 'End Volt', 'Status']],
        body: loopsData,
        theme: 'grid',
        headStyles: { fillColor: [0, 112, 243] },
        styles: { fontSize: 8 }
      });
      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Battery Calc
      doc.setFontSize(12);
      doc.text("Battery Calculation", 14, yPos);
      yPos += 4;
      
      // @ts-ignore
      doc.autoTable({
        startY: yPos,
        head: [['Parameter', 'Value']],
        body: [
          ['Total Standby Current', `${systemCalculations.totalStandbyMA.toFixed(1)} mA`],
          ['Total Alarm Current', `${systemCalculations.totalAlarmMA.toFixed(1)} mA`],
          ['Standby Time', `${standbyHours} Hours`],
          ['Alarm Time', `${alarmMinutes} Minutes`],
          ['Calculated Capacity (incl. 25% safety)', `${systemCalculations.batteryAh.toFixed(2)} Ah`],
          ['Recommended Battery Size', `${systemCalculations.recommendedBattery} Ah`]
        ],
        theme: 'grid',
        styles: { fontSize: 9 }
      });
      
      doc.save(`FireAlarm_Report_${projectInfo.name || 'Project'}.pdf`);
      toast({ title: "Success", description: "PDF exported successfully!" });
    } catch (e) {
      toast({ title: "Export Failed", description: "Failed to generate PDF.", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Loops Summary
      const loopsData = loopCalculations.map(l => ({
        "Loop Name": l.name,
        "Cable Length (m)": l.cableLength,
        "Cable Size (mm2)": l.cableSizeMM2,
        "Material": l.cableMaterial.toUpperCase(),
        "Total Devices": l.totalDevices,
        "Standby mA": l.standbyCurrentMA.toFixed(2),
        "Alarm mA": l.alarmCurrentMA.toFixed(2),
        "Resistance (Ohms)": l.loopResistance.toFixed(2),
        "Voltage Drop (V)": l.voltageDrop.toFixed(2),
        "Drop %": l.voltageDropPct.toFixed(2),
        "End Voltage (V)": l.endVoltage.toFixed(2),
        "Status": l.status.toUpperCase()
      }));
      const ws1 = XLSX.utils.json_to_sheet(loopsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Loops Summary");
      
      // Sheet 2: Battery Calc
      const battData = [
        { Parameter: "System Standby Current (mA)", Value: systemCalculations.totalStandbyMA.toFixed(2) },
        { Parameter: "System Alarm Current (mA)", Value: systemCalculations.totalAlarmMA.toFixed(2) },
        { Parameter: "Standby Time (Hours)", Value: standbyHours },
        { Parameter: "Alarm Time (Minutes)", Value: alarmMinutes },
        { Parameter: "Calculated Capacity (Ah)", Value: systemCalculations.batteryAh.toFixed(2) },
        { Parameter: "Recommended Battery (Ah)", Value: systemCalculations.recommendedBattery }
      ];
      const ws2 = XLSX.utils.json_to_sheet(battData);
      XLSX.utils.book_append_sheet(wb, ws2, "Battery Calc");
      
      XLSX.writeFile(wb, `FireAlarm_Calc_${projectInfo.name || 'Project'}.xlsx`);
      toast({ title: "Success", description: "Excel exported successfully!" });
    } catch (e) {
      toast({ title: "Export Failed", description: "Failed to generate Excel.", variant: "destructive" });
    }
  };

  const handleSaveProject = () => {
    const data = JSON.stringify({ projectInfo, selectedBrandId, selectedPanelId, loops, standbyHours, alarmMinutes });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FireAlarm_${projectInfo.name || 'Project'}.json`;
    a.click();
    toast({ title: "Project Saved", description: "Your project file has been downloaded." });
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.loops) {
          setProjectInfo(data.projectInfo || projectInfo);
          setSelectedBrandId(data.selectedBrandId || brands[0].id);
          setSelectedPanelId(data.selectedPanelId || "");
          setLoops(data.loops);
          setStandbyHours(data.standbyHours || 24);
          setAlarmMinutes(data.alarmMinutes || 30);
          toast({ title: "Project Loaded", description: "Successfully loaded project." });
        }
      } catch (err) {
        toast({ title: "Load Failed", description: "Invalid project file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto pb-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* LEFT SIDEBAR - PROJECT & CONFIG */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
        <div className="sticky top-6 space-y-6">
          <Card className="glass-card border-0 shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" /> 
                  {t("Fire Alarm LSN", "إنذار الحريق LSN")}
                </CardTitle>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}>EN</button>
                  <button onClick={() => setLanguage('ar')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === 'ar' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}>AR</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input placeholder={t("Project Name", "اسم المشروع")} value={projectInfo.name} onChange={e => setProjectInfo({...projectInfo, name: e.target.value})} className="bg-white/50 dark:bg-black/20" />
                <Input placeholder={t("Engineer Name", "اسم المهندس")} value={projectInfo.engineer} onChange={e => setProjectInfo({...projectInfo, engineer: e.target.value})} className="bg-white/50 dark:bg-black/20" />
                <Input placeholder={t("Client Name", "اسم العميل")} value={projectInfo.client} onChange={e => setProjectInfo({...projectInfo, client: e.target.value})} className="bg-white/50 dark:bg-black/20" />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-2">
                  <Label>{t("System Brand", "العلامة التجارية")}</Label>
                  <Select value={selectedBrandId} onValueChange={handleBrandChange}>
                    <SelectTrigger className="bg-white/50 dark:bg-black/20 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {currentBrand && currentBrand.panels.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t("Fire Panel Model", "لوحة الإنذار")}</Label>
                    <Select value={selectedPanelId} onValueChange={setSelectedPanelId}>
                      <SelectTrigger className="bg-white/50 dark:bg-black/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentBrand.panels.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <Label className="flex items-center gap-2"><Battery className="w-4 h-4 text-emerald-500" /> {t("Battery Config", "إعدادات البطارية")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">{t("Standby (Hours)", "زمن الاستعداد (ساعات)")}</Label>
                    <Input type="number" value={standbyHours} onChange={e => setStandbyHours(Number(e.target.value)||0)} className="bg-white/50 dark:bg-black/20" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">{t("Alarm (Minutes)", "زمن الإنذار (دقائق)")}</Label>
                    <Input type="number" value={alarmMinutes} onChange={e => setAlarmMinutes(Number(e.target.value)||0)} className="bg-white/50 dark:bg-black/20" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={handleSaveProject}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <div className="relative flex-1">
                  <Button variant="outline" className="w-full text-xs">
                    <Upload className="w-4 h-4 mr-2" /> Load
                  </Button>
                  <input type="file" accept=".json" onChange={handleLoadProject} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary Card */}
          <Card className="glass-card border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t("Total Loops", "إجمالي الحلقات")}</span>
                <span className="font-bold">{loops.length} / {currentPanel?.maxLoops || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t("Total Devices", "إجمالي الأجهزة")}</span>
                <span className="font-bold">{loopCalculations.reduce((acc, curr) => acc + curr.totalDevices, 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t("System Standby", "استهلاك الاستعداد")}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{systemCalculations.totalStandbyMA.toFixed(1)} mA</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RIGHT PANEL - MAIN CONTENT */}
      <div className="flex-1 min-w-0">
        <Tabs defaultValue="loops" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <TabsList className="glass p-1">
              <TabsTrigger value="loops" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
                <Cable className="w-4 h-4 mr-2" /> {t("Loops", "الحلقات")}
              </TabsTrigger>
              <TabsTrigger value="battery" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
                <Battery className="w-4 h-4 mr-2" /> {t("Battery", "البطارية")}
              </TabsTrigger>
              <TabsTrigger value="sld" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
                <Settings2 className="w-4 h-4 mr-2" /> {t("Diagram", "مخطط الدائرة")}
              </TabsTrigger>
              <TabsTrigger value="export" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
                <Download className="w-4 h-4 mr-2" /> {t("Export", "التصدير")}
              </TabsTrigger>
            </TabsList>
            
            <Button 
              onClick={handleAddLoop} 
              disabled={!currentPanel || loops.length >= currentPanel.maxLoops}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-full px-6"
            >
              <Plus className="w-4 h-4 mr-2" /> {t("Add Loop", "إضافة حلقة")}
            </Button>
          </div>

          <TabsContent value="loops" className="space-y-4 focus-visible:outline-none">
            <AnimatePresence>
              {loopCalculations.map((loop, index) => (
                <motion.div
                  key={loop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`glass-card border-0 shadow-md overflow-hidden relative ${
                    loop.status === 'danger' ? 'ring-1 ring-red-500/50' :
                    loop.status === 'warning' ? 'ring-1 ring-amber-500/50' : 'ring-1 ring-emerald-500/20'
                  }`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      loop.status === 'danger' ? 'bg-red-500' :
                      loop.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    
                    {/* Loop Header */}
                    <div className="p-4 pl-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => toggleLoopExpand(loop.id)}>
                      <div className="flex items-center gap-4 flex-1">
                        <Input 
                          value={loop.name} 
                          onChange={(e) => handleUpdateLoop(loop.id, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-40 font-bold bg-transparent border-transparent hover:border-slate-200 focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all px-2 h-8"
                        />
                        <div className="hidden md:flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-xs">
                            <Cable className="w-3 h-3 mr-1" /> {loop.totalDevices} Dev
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            {loop.standbyCurrentMA.toFixed(1)} mA
                          </Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
                            {loop.alarmCurrentMA.toFixed(1)} mA (Alarm)
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {loop.status === 'safe' && <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Safe: {loop.voltageDropPct.toFixed(1)}%</Badge>}
                        {loop.status === 'warning' && <Badge className="bg-amber-500 hover:bg-amber-600"><AlertTriangle className="w-3 h-3 mr-1"/> Warn: {loop.voltageDropPct.toFixed(1)}%</Badge>}
                        {loop.status === 'danger' && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1"/> Danger: {loop.voltageDropPct.toFixed(1)}%</Badge>}
                        
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary" onClick={() => handleDuplicateLoop(loop)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate Loop</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => handleDeleteLoop(loop.id)} disabled={loops.length === 1}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Loop</TooltipContent>
                          </Tooltip>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {loop.expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Loop Body */}
                    {loop.expanded && (
                      <div className="p-4 pl-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                        {/* Cable Params */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">Cable Length (m) <Tooltip><TooltipTrigger><Info className="w-3 h-3"/></TooltipTrigger><TooltipContent>One-way length. Formula multiplies by 2 automatically.</TooltipContent></Tooltip></Label>
                            <Input type="number" value={loop.cableLength} onChange={e => handleUpdateLoop(loop.id, { cableLength: Number(e.target.value)||0 })} className="h-9" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Cross Section (mm²)</Label>
                            <Input type="number" value={loop.cableSizeMM2} onChange={e => handleUpdateLoop(loop.id, { cableSizeMM2: Number(e.target.value)||0 })} className="h-9" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Material</Label>
                            <Select value={loop.cableMaterial} onValueChange={(v: "cu"|"al") => handleUpdateLoop(loop.id, { cableMaterial: v })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cu">Copper (Cu)</SelectItem>
                                <SelectItem value="al">Aluminum (Al)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Devices Table */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <Label className="font-semibold">{t("Devices on Loop", "الأجهزة على الحلقة")}</Label>
                            {loop.maxDevicesReached && <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">⚠️ Max Devices ({currentPanel?.maxDevicesPerLoop}) Reached</span>}
                          </div>
                          
                          <div className="space-y-2">
                            {loop.devices.map((device, idx) => (
                              <div key={device.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex-1 min-w-[200px]">
                                  <Select 
                                    value={device.deviceId} 
                                    onValueChange={(v) => handleUpdateDevice(loop.id, device.id, { deviceId: v })}
                                  >
                                    <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-900 border-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="custom" className="font-bold text-primary">-- Custom Device --</SelectItem>
                                      {currentBrand?.devices.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {device.deviceId === "custom" && (
                                  <>
                                    <Input 
                                      placeholder="Name" 
                                      value={device.customName || ""} 
                                      onChange={(e) => handleUpdateDevice(loop.id, device.id, { customName: e.target.value })}
                                      className="h-9 w-32"
                                    />
                                    <div className="flex items-center gap-1 w-24">
                                      <Input 
                                        type="number" 
                                        placeholder="mA" 
                                        value={device.customCurrentMA || ""} 
                                        onChange={(e) => handleUpdateDevice(loop.id, device.id, { customCurrentMA: Number(e.target.value) })}
                                        className="h-9"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1 w-24">
                                      <Input 
                                        type="number" 
                                        placeholder="Alarm mA" 
                                        value={device.customAlarmCurrentMA || ""} 
                                        onChange={(e) => handleUpdateDevice(loop.id, device.id, { customAlarmCurrentMA: Number(e.target.value) })}
                                        className="h-9"
                                      />
                                    </div>
                                  </>
                                )}
                                
                                <div className="flex items-center gap-2 w-24 ml-auto">
                                  <Label className="text-xs text-slate-500 md:hidden">Qty</Label>
                                  <Input 
                                    type="number" 
                                    min={1}
                                    value={device.quantity} 
                                    onChange={(e) => handleUpdateDevice(loop.id, device.id, { quantity: Number(e.target.value) || 1 })}
                                    className="h-9 font-bold text-center"
                                  />
                                </div>
                                
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteDevice(loop.id, device.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button 
                              variant="outline" 
                              className="w-full border-dashed text-primary hover:bg-primary/5 hover:text-primary h-10 mt-2" 
                              onClick={() => handleAddDevice(loop.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" /> Add Device
                            </Button>
                          </div>
                        </div>

                        {/* Loop Results Row */}
                        <div className="mt-6 bg-slate-900 dark:bg-black text-white rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 shadow-inner">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Loop Resistance</p>
                            <p className="text-lg font-display font-semibold">{loop.loopResistance.toFixed(2)} Ω</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Voltage Drop</p>
                            <p className="text-lg font-display font-semibold">{loop.voltageDrop.toFixed(2)} V</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">End Voltage</p>
                            <p className="text-lg font-display font-semibold">{loop.endVoltage.toFixed(2)} V</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Max Devices</p>
                            <p className={`text-lg font-display font-semibold ${loop.maxDevicesReached ? 'text-red-400' : 'text-emerald-400'}`}>
                              {loop.totalDevices} / {currentPanel?.maxDevicesPerLoop || 0}
                            </p>
                          </div>
                        </div>

                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="battery">
            <Card className="glass-card shadow-xl border-0 overflow-hidden">
              <div className="h-3 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <CardContent className="p-8">
                <div className="text-center mb-10">
                  <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-inner">
                    <Battery className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-display font-bold">{t("Battery Calculation", "حساب البطارية")}</h2>
                  <p className="text-slate-500 mt-2">{t("Calculated based on EN-54 standards with 25% safety margin.", "محسوب بناءً على معايير EN-54 مع هامش أمان 25٪.")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Total Standby Current</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{systemCalculations.totalStandbyMA.toFixed(1)} <span className="text-sm font-normal">mA</span></p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold">
                        {standbyHours}h
                      </div>
                    </div>
                    
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Total Alarm Current</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{systemCalculations.totalAlarmMA.toFixed(1)} <span className="text-sm font-normal">mA</span></p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold">
                        {alarmMinutes}m
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                    
                    <p className="text-slate-400 font-medium mb-2">Calculated Capacity</p>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-5xl font-display font-bold">{systemCalculations.batteryAh.toFixed(2)}</span>
                      <span className="text-xl text-slate-400">Ah</span>
                    </div>

                    <div className="h-px w-full bg-white/10 my-4" />

                    <p className="text-emerald-400 font-medium mb-2">Recommended Standard Size</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-display font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{systemCalculations.recommendedBattery}</span>
                      <span className="text-2xl text-emerald-500">Ah</span>
                    </div>
                  </div>
                </div>

                <div className="max-w-4xl mx-auto mt-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                    <span className="text-primary font-bold">Formula:</span> Ah = [(Standby_mA × {standbyHours}h) + (Alarm_mA × {alarmMinutes / 60}h)] / 1000 × 1.25
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sld">
            <Card className="glass-card shadow-xl border-0">
              <CardHeader>
                <CardTitle>{t("Single Line Diagram", "مخطط الدائرة")}</CardTitle>
                <CardDescription>Auto-generated architecture schematic</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[800px] p-8 flex justify-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <svg width="100%" height={Math.max(400, loopCalculations.length * 120 + 150)} className="font-sans">
                    {/* Panel Node */}
                    <rect x="50%" y="20" width="160" height="80" rx="12" fill="white" stroke="#3b82f6" strokeWidth="3" transform="translate(-80, 0)" className="dark:fill-slate-800" />
                    <text x="50%" y="55" textAnchor="middle" fill="currentColor" className="font-bold text-lg dark:fill-white">{currentBrand?.name}</text>
                    <text x="50%" y="75" textAnchor="middle" fill="#64748b" className="text-sm font-medium">{currentPanel?.name}</text>

                    {/* Loops */}
                    {loopCalculations.map((loop, i) => {
                      const yOffset = 180 + i * 140;
                      const lineColor = loop.status === 'danger' ? '#ef4444' : loop.status === 'warning' ? '#f59e0b' : '#10b981';
                      
                      return (
                        <g key={loop.id}>
                          {/* Line from Panel */}
                          {i === 0 && <line x1="50%" y1="100" x2="50%" y2="180" stroke={lineColor} strokeWidth="3" />}
                          {i > 0 && <line x1="50%" y1={180 + (i-1)*140 + 80} x2="50%" y2={yOffset} stroke={lineColor} strokeWidth="3" />}
                          
                          {/* Loop Box */}
                          <rect x="50%" y={yOffset} width="220" height="100" rx="8" fill="white" stroke={lineColor} strokeWidth="2" transform="translate(-110, 0)" className="dark:fill-slate-800" />
                          <rect x="50%" y={yOffset} width="220" height="30" rx="8" fill={lineColor} opacity="0.1" transform="translate(-110, 0)" />
                          
                          <text x="50%" y={yOffset + 20} textAnchor="middle" fill={lineColor} className="font-bold">{loop.name}</text>
                          
                          <text x="50%" y={yOffset + 45} textAnchor="middle" fill="currentColor" className="text-xs dark:fill-slate-300" transform="translate(-40, 0)">🔥 Detectors: {loop.detectorsCount}</text>
                          <text x="50%" y={yOffset + 45} textAnchor="middle" fill="currentColor" className="text-xs dark:fill-slate-300" transform="translate(50, 0)">📢 Sounders: {loop.soundersCount}</text>
                          
                          <text x="50%" y={yOffset + 65} textAnchor="middle" fill="currentColor" className="text-xs dark:fill-slate-300" transform="translate(-40, 0)">🔴 Callpoints: {loop.callpointsCount}</text>
                          <text x="50%" y={yOffset + 65} textAnchor="middle" fill="currentColor" className="text-xs dark:fill-slate-300" transform="translate(50, 0)">📦 Modules: {loop.modulesCount}</text>
                          
                          <text x="50%" y={yOffset + 85} textAnchor="middle" fill="#64748b" className="text-xs font-mono">{loop.cableLength}m | {loop.cableSizeMM2}mm² | {loop.voltageDropPct.toFixed(1)}% Drop</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group cursor-pointer" onClick={handleExportPDF}>
                <CardContent className="p-10 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold font-display">Export PDF</h3>
                  <p className="text-slate-500">Generate a comprehensive multi-page PDF report with all tables and calculations formatted for printing.</p>
                  <Button className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-full">Download PDF</Button>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group cursor-pointer" onClick={handleExportExcel}>
                <CardContent className="p-10 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold font-display">Export Excel</h3>
                  <p className="text-slate-500">Download raw data into a multi-sheet XLSX file for further processing or archiving.</p>
                  <Button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Download Excel</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
