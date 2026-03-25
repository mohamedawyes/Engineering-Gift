export type DeviceType = "detector" | "module" | "sounder" | "callpoint";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  currentMA: number;
  alarmCurrentMA: number;
  voltageMin: number;
  voltageMax: number;
  maxPerLoop: number;
  description?: string;
}

export interface Panel {
  id: string;
  name: string;
  maxLoops: number;
  maxDevicesPerLoop: number;
  nominalVoltage: number;
  maxLoopCurrent: number;
  batteryBackup: boolean;
}

export interface Brand {
  id: string;
  name: string;
  panels: Panel[];
  devices: Device[];
}

export const brands: Brand[] = [
  {
    id: "bosch",
    name: "BOSCH",
    panels: [
      {
        id: "fpa-5000",
        name: "FPA-5000",
        maxLoops: 8,
        maxDevicesPerLoop: 127,
        nominalVoltage: 24,
        maxLoopCurrent: 400,
        batteryBackup: true
      },
      {
        id: "fpa-1200",
        name: "FPA-1200",
        maxLoops: 2,
        maxDevicesPerLoop: 127,
        nominalVoltage: 24,
        maxLoopCurrent: 300,
        batteryBackup: true
      },
      {
        id: "avenar-8000",
        name: "AVENAR panel 8000",
        maxLoops: 16,
        maxDevicesPerLoop: 127,
        nominalVoltage: 24,
        maxLoopCurrent: 500,
        batteryBackup: true
      }
    ],
    devices: [
      { id: "fap-325", name: "LSN Smoke Detector (FAP-325)", type: "detector", currentMA: 0.4, alarmCurrentMA: 5, voltageMin: 17, voltageMax: 28, maxPerLoop: 127 },
      { id: "fat-320", name: "LSN Heat Detector (FAT-320)", type: "detector", currentMA: 0.4, alarmCurrentMA: 5, voltageMin: 17, voltageMax: 28, maxPerLoop: 127 },
      { id: "fmc-320", name: "LSN Manual Call Point (FMC-320)", type: "callpoint", currentMA: 0.2, alarmCurrentMA: 3, voltageMin: 17, voltageMax: 28, maxPerLoop: 127 },
      { id: "fds-320", name: "LSN Sounder/Strobe (FDS-320)", type: "sounder", currentMA: 2, alarmCurrentMA: 80, voltageMin: 17, voltageMax: 28, maxPerLoop: 127 },
      { id: "flm-420", name: "LSN Input Module (FLM-420)", type: "module", currentMA: 0.3, alarmCurrentMA: 3, voltageMin: 17, voltageMax: 28, maxPerLoop: 127 },
      { id: "flm-420-r", name: "LSN Output Module (FLM-420-R)", type: "module", currentMA: 0.3, alarmCurrentMA: 5, voltageMin: 17, voltageMax: 28, maxPerLoop: 127 }
    ]
  },
  {
    id: "honeywell",
    name: "HONEYWELL",
    panels: [
      {
        id: "ms-9200udls",
        name: "MS-9200UDLS",
        maxLoops: 2,
        maxDevicesPerLoop: 99,
        nominalVoltage: 24,
        maxLoopCurrent: 350,
        batteryBackup: true
      },
      {
        id: "ms-9600udls",
        name: "MS-9600UDLS",
        maxLoops: 6,
        maxDevicesPerLoop: 99,
        nominalVoltage: 24,
        maxLoopCurrent: 350,
        batteryBackup: true
      }
    ],
    devices: [
      { id: "b501bh", name: "Photo Smoke B501BH", type: "detector", currentMA: 0.5, alarmCurrentMA: 6, voltageMin: 15, voltageMax: 32, maxPerLoop: 99 },
      { id: "b401bh", name: "Heat Detector B401BH", type: "detector", currentMA: 0.5, alarmCurrentMA: 6, voltageMin: 15, voltageMax: 32, maxPerLoop: 99 },
      { id: "m500k", name: "Pull Station M500K", type: "callpoint", currentMA: 0.3, alarmCurrentMA: 3, voltageMin: 15, voltageMax: 32, maxPerLoop: 99 },
      { id: "notif-app", name: "Notification Appliance", type: "sounder", currentMA: 3, alarmCurrentMA: 100, voltageMin: 15, voltageMax: 32, maxPerLoop: 99 },
      { id: "mmf-301", name: "Monitor Module MMF-301", type: "module", currentMA: 0.4, alarmCurrentMA: 4, voltageMin: 15, voltageMax: 32, maxPerLoop: 99 },
      { id: "cmf-300-6", name: "Control Module CMF-300-6", type: "module", currentMA: 0.4, alarmCurrentMA: 5, voltageMin: 15, voltageMax: 32, maxPerLoop: 99 }
    ]
  },
  {
    id: "siemens",
    name: "SIEMENS",
    panels: [
      {
        id: "fc722",
        name: "FC722",
        maxLoops: 2,
        maxDevicesPerLoop: 127,
        nominalVoltage: 24,
        maxLoopCurrent: 400,
        batteryBackup: true
      },
      {
        id: "fc2025",
        name: "FC2025",
        maxLoops: 8,
        maxDevicesPerLoop: 127,
        nominalVoltage: 24,
        maxLoopCurrent: 450,
        batteryBackup: true
      }
    ],
    devices: [
      { id: "fdoot241-9", name: "FDOOT241-9", type: "detector", currentMA: 0.3, alarmCurrentMA: 4, voltageMin: 15, voltageMax: 30, maxPerLoop: 127 },
      { id: "fdt181-9", name: "FDT181-9", type: "detector", currentMA: 0.3, alarmCurrentMA: 4, voltageMin: 15, voltageMax: 30, maxPerLoop: 127 },
      { id: "dpi-h", name: "DPI-H", type: "callpoint", currentMA: 0.2, alarmCurrentMA: 2, voltageMin: 15, voltageMax: 30, maxPerLoop: 127 },
      { id: "hfp-11", name: "HFP-11", type: "sounder", currentMA: 2, alarmCurrentMA: 85, voltageMin: 15, voltageMax: 30, maxPerLoop: 127 },
      { id: "ft2010-a1", name: "FT2010-A1", type: "module", currentMA: 0.3, alarmCurrentMA: 4, voltageMin: 15, voltageMax: 30, maxPerLoop: 127 },
      { id: "ft2010-b1", name: "FT2010-B1", type: "module", currentMA: 0.3, alarmCurrentMA: 5, voltageMin: 15, voltageMax: 30, maxPerLoop: 127 }
    ]
  },
  {
    id: "custom",
    name: "CUSTOM",
    panels: [
      {
        id: "custom-panel",
        name: "Custom Panel",
        maxLoops: 15,
        maxDevicesPerLoop: 250,
        nominalVoltage: 24,
        maxLoopCurrent: 500,
        batteryBackup: true
      }
    ],
    devices: []
  }
];
