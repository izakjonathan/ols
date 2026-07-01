"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Service = { id: string; name: string; price: number; note?: string; description?: string; draft?: boolean };
type Extra = { id: string; name: string; price: number; note?: string; description?: string; draft?: boolean };
type CarePackage = { id: string; title: string; price: number; items: string[]; icon: "shield" | "diamond" | "crown" | "laurel"; description?: string; draft?: boolean };
type CarEntry = { id: string; type: string; makeModel: string; reg: string; packageId: string; services: string[]; extras: string[]; notes: string; uploads: string[] };
type CustomerInfo = { name: string; phone: string; email: string; address: string };
type InvoiceInfo = { invoiceType: string; company: string; cvr: string; invoiceEmail: string; invoiceAddress: string; paymentMethod: string; customerType: string };
type OrderStatus = "Ny" | "Kontaktet" | "Bekræftet" | "Planlagt" | "I gang" | "Udført" | "Færdig" | "Faktura sendt" | "Faktureret" | "Betaling modtaget" | "Annulleret";
type PaymentStatus = "Ikke faktureret" | "Faktura sendt" | "Sendt" | "Betalt" | "Afventer" | "Forfalden";
type InvoiceStatus = "Kladde" | "Sendt" | "Betalt" | "Forfalden" | "Annulleret";
type InvoiceLine = { id: string; text: string; qty: number; price: number };
type InvoiceRecord = { id: string; orderId: string; invoiceNo: string; createdAt: string; dueDate: string; sentAt?: string; paidAt?: string; customerName: string; email: string; invoiceAddress: string; company: string; cvr: string; status: InvoiceStatus; lines: InvoiceLine[]; note: string };
type Priority = "Normal" | "Haster" | "VIP";
type Employee = { id: string; name: string; token: string; active: boolean; createdAt: string };
type TimeEntry = { id: string; employeeId: string; employeeName: string; date: string; startTime: string; endTime: string; taskName: string; note: string; hours: number; createdAt: string; kind: "work" | "adjustment" };
type CompanyInfo = { name: string; phone: string; email: string; openingHours: string; address: string; invoiceName: string; cvr: string; invoiceEmail: string; invoiceAddress: string; paymentTerms: string; bankInfo: string };
type AdminView = "newOrders" | "calendar" | "invoices" | "completed" | "services" | "company" | "employees" | "settings";
type Order = {
  id: string;
  createdAt: string;
  customer: CustomerInfo;
  invoice: InvoiceInfo;
  preferredDate: string;
  preferredTime: string;
  cars: CarEntry[];
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  priority?: Priority;
  assignedTo?: string;
  adminDate: string;
  adminTime: string;
  adminNotes: string;
  customerMessage: string;
  activity?: string[];
};

const STORAGE_KEY = "oland-service-orders-v1";
const INVOICE_STORAGE_KEY = "oland-service-invoices-v1";
const SERVICE_DRAFTS_KEY = "oland-service-service-drafts-v1";
const COMPANY_INFO_KEY = "oland-service-company-info-v1";
const LEGACY_STORAGE_KEY = "oland-service-orders-v1";

const EMPLOYEES_STORAGE_KEY = "oland-service-employees-v1";
const TIME_ENTRIES_STORAGE_KEY = "oland-service-time-entries-v1";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TABLE || "oland_service_state";
const SUPABASE_STATE_ID = process.env.NEXT_PUBLIC_SUPABASE_STATE_ID || "main";

type PersistentState = {
  orders?: Order[];
  invoices?: InvoiceRecord[];
  serviceDrafts?: { services: Service[]; extras: Extra[]; packages: CarePackage[] };
  companyInfo?: CompanyInfo;
  employees?: Employee[];
  timeEntries?: TimeEntry[];
  updatedAt?: string;
};

function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase error ${response.status}: ${message}`);
  }
  return response;
}

async function loadSupabaseState(): Promise<PersistentState | null> {
  if (!supabaseConfigured()) return null;
  const response = await supabaseRequest(`${SUPABASE_TABLE}?select=data&id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&limit=1`);
  const rows = await response.json();
  return rows?.[0]?.data ?? null;
}

async function saveSupabaseState(data: PersistentState) {
  if (!supabaseConfigured()) return;
  await supabaseRequest(SUPABASE_TABLE, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: SUPABASE_STATE_ID, data: { ...data, updatedAt: new Date().toISOString() } })
  });
}

function hoursBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return Math.max(0, Math.round(((endMinutes - startMinutes) / 60) * 100) / 100);
}

function formatHours(hours: number) {
  return `${hours.toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} timer`;
}


let services: Service[] = [
  { id: "moving-small", name: "Mindre flytteopgave", price: 699, description: "Hjælp til mindre flytninger, afhentning eller levering." },
  { id: "moving-full", name: "Flytning med mandskab", price: 1499, description: "Transport og praktisk hjælp ved private og erhvervsflytninger." },
  { id: "delivery", name: "Varetransport", price: 499, description: "Transport af møbler, udstyr, varer eller større genstande." },
  { id: "courier", name: "Ekspreskørsel", price: 399, description: "Hurtig afhentning og levering samme dag." },
  { id: "airport", name: "Lufthavnstransport", price: 599, description: "Planlagt transport til og fra lufthavn." },
  { id: "handyman", name: "Bære- og montagehjælp", price: 449, description: "Hjælp til at bære, samle, flytte eller placere ting." },
  { id: "business", name: "Erhvervslogistik", price: 899, description: "Fleksibel hjælp til virksomheder, events og kontoropgaver." },
  { id: "waste", name: "Bortkørsel", price: 599, description: "Bortkørsel af affald, inventar eller overskudsmateriale." }
];

let extras: Extra[] = [
  { id: "extra-helper", name: "Ekstra mand", price: 350, note: "pr. time" },
  { id: "stairs", name: "Trapper / tung bæring", price: 250, note: "fra 250 kr." },
  { id: "evening", name: "Aften/weekend", price: 300 },
  { id: "waiting", name: "Ventetid", price: 200, note: "pr. påbegyndt time" }
];

let packages: CarePackage[] = [
  { id: "basis", title: "Basis transport", price: 699, icon: "shield", items: ["Afhentning og levering", "Én chauffør", "Op til 1 time", "Planlagt tidspunkt"] },
  { id: "moving", title: "Flyttehjælp", price: 1499, icon: "diamond", items: ["Transportvogn", "Chauffør + hjælper", "Bæring til/fra adresse", "Op til 2 timer"] },
  { id: "business", title: "Erhverv & event", price: 2499, icon: "crown", items: ["Koordineret logistik", "Flere stop", "Udstyr/inventar", "Fleksibel tidsplan"] },
  { id: "fullservice", title: "Full service", price: 3999, icon: "laurel", items: ["Planlægning", "Pakke-/bærehjælp", "Transport", "Oprydning/bortkørsel"] }
];

const statuses: OrderStatus[] = ["Ny", "Bekræftet", "Planlagt", "I gang", "Udført", "Faktura sendt", "Betaling modtaget", "Annulleret"];
const paymentStatuses: PaymentStatus[] = ["Ikke faktureret", "Faktura sendt", "Betalt", "Forfalden"];
const priorities: Priority[] = ["Normal", "Haster", "VIP"];
const adminViews: Array<{ id: AdminView; label: string; icon: string }> = [
  { id: "newOrders", label: "Nye", icon: "＋" },
  { id: "calendar", label: "Kalender", icon: "◷" },
  { id: "invoices", label: "Faktura", icon: "◆" },
  { id: "completed", label: "Færdige", icon: "✓" },
  { id: "services", label: "Ydelser", icon: "✎" },
  { id: "company", label: "Firma", icon: "◎" },
  { id: "employees", label: "Timer", icon: "◴" },
  { id: "settings", label: "Backup", icon: "↧" }
];

const emptyCustomer: CustomerInfo = { name: "", phone: "", email: "", address: "" };
const emptyInvoice: InvoiceInfo = { invoiceType: "", company: "", cvr: "", invoiceEmail: "", invoiceAddress: "", paymentMethod: "Faktura", customerType: "" };
const defaultCompanyInfo: CompanyInfo = { name: "Ølands Service", phone: "26848789", email: "kontakt@olandservice.dk", openingHours: "Åben 8-20 hver dag", address: "", invoiceName: "Ølands Service", cvr: "", invoiceEmail: "kontakt@olandservice.dk", invoiceAddress: "", paymentTerms: "8 dage", bankInfo: "" };
const makeCar = (): CarEntry => ({ id: cryptoId(), type: "Transport", makeModel: "", reg: "", packageId: "basis", services: [], extras: [], notes: "", uploads: [] });

function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function kr(value: number) {
  return `${value.toLocaleString("da-DK")} kr.`;
}

function carTotal(car: CarEntry) {
  const pack = packages.find((item) => item.id === car.packageId);
  const packageTotal = pack ? pack.price : 0;
  const serviceTotal = car.services.reduce((sum, id) => sum + (services.find((item) => item.id === id)?.price ?? 0), 0);
  const extraTotal = car.extras.reduce((sum, id) => sum + (extras.find((item) => item.id === id)?.price ?? 0), 0);
  return packageTotal + serviceTotal + extraTotal;
}

function orderTotal(order: Pick<Order, "cars">) {
  return order.cars.reduce((sum, car) => sum + carTotal(car), 0);
}

function invoiceTotal(invoice: Pick<InvoiceRecord, "lines">) {
  return invoice.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
}

function invoiceEmailBody(invoice: InvoiceRecord) {
  const lines = invoice.lines.map((line) => `${line.text} - ${line.qty} x ${kr(line.price)} = ${kr(line.qty * line.price)}`).join("\n");
  return [`Hej ${invoice.customerName || ""}`, "", `Her er faktura ${invoice.invoiceNo} fra Ølands Service.`, "", lines, "", `Total: ${kr(invoiceTotal(invoice))}`, `Forfaldsdato: ${invoice.dueDate || "ikke sat"}`, "", invoice.note || "Tak for din ordre.", "", "Med venlig hilsen", "Ølands Service"].join("\n");
}

function normaliseInvoice(invoice: InvoiceRecord): InvoiceRecord {
  return {
    ...invoice,
    status: invoice.status ?? "Kladde",
    lines: invoice.lines ?? [],
    note: invoice.note ?? ""
  };
}

function selectedNames(ids: string[], source: Array<{ id: string; name: string }>) {
  return ids.map((id) => source.find((item) => item.id === id)?.name).filter(Boolean).join(", ");
}

function fileNameSummary(files: string[]) {
  return files.filter(Boolean).join(", ");
}

function normaliseCatalog(catalog: any) {
  const oldCarCareIds = new Set(["handwash", "inside", "complete", "fabric", "leather", "engine", "wheels", "paintclean", "one-step", "two-step", "ceramic", "hair", "odor"]);
  const incomingServices = Array.isArray(catalog?.services) ? catalog.services : [];
  const hasOldCarCare = incomingServices.some((item: Service) => oldCarCareIds.has(item.id));
  if (!catalog || hasOldCarCare) {
    return {
      services: services.map((item) => ({ ...item, draft: false })),
      extras: extras.map((item) => ({ ...item, draft: false })),
      packages: packages.map((item) => ({ ...item, draft: false, description: item.items.join(", ") }))
    };
  }
  return catalog;
}

function normaliseOrder(order: Order): Order {
  return {
    ...order,
    invoice: { ...emptyInvoice, ...(order.invoice ?? {}) },
    cars: (order.cars ?? []).map((car) => ({ ...makeCar(), ...car, uploads: (car as any)?.uploads ?? [] })),
    status: ((order.status === "Kontaktet" ? "Ny" : order.status === "Færdig" ? "Udført" : order.status === "Faktureret" ? "Faktura sendt" : order.status) ?? "Ny") as OrderStatus,
    paymentStatus: order.paymentStatus ?? "Ikke faktureret",
    priority: order.priority ?? "Normal",
    assignedTo: order.assignedTo ?? "",
    activity: order.activity ?? [`Oprettet ${new Date(order.createdAt || Date.now()).toLocaleString("da-DK")}`]
  };
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const common = "fill-none stroke-current stroke-[1.6] stroke-linecap-round stroke-linejoin-round";
  if (name === "shield") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="M32 6 52 14v14c0 15-8.6 25-20 30C20.6 53 12 43 12 28V14L32 6Z" /><path className="fill-current" d="m32 20 3.1 6.3 7 1-5 4.9 1.2 6.9-6.3-3.3-6.3 3.3 1.2-6.9-5-4.9 7-1L32 20Z" /></svg>;
  if (name === "diamond") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="M12 22 22 10h20l10 12-20 34L12 22Z" /><path className={common} d="M12 22h40M22 10l10 46 10-46M22 10l-3 12 13 34 13-34-3-12" /></svg>;
  if (name === "crown") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="m10 48 6-30 12 16 8-22 8 22 12-16 6 30H10Z" /><path className={common} d="M14 56h44M18 48h36" /><circle className={common} cx="16" cy="18" r="3" /><circle className={common} cx="36" cy="12" r="3" /><circle className={common} cx="56" cy="18" r="3" /></svg>;
  if (name === "laurel") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="M22 10C12 18 8 28 10 42c1 7 5 12 12 16" /><path className={common} d="M42 10c10 8 14 18 12 32-1 7-5 12-12 16" /><path className={common} d="M15 21c-5 0-8-2-10-5 5 0 9 1 12 5Zm-3 9c-5 1-8-1-11-4 5-1 9 0 12 4Zm1 10c-4 3-8 2-12 0 4-3 8-3 12 0Zm7 10c-3 4-7 5-12 4 3-4 7-5 12-4Zm29-29c5 0 8-2 10-5-5 0-9 1-12 5Zm3 9c5 1 8-1 11-4-5-1-9 0-12 4Zm-1 10c4 3 8 2 12 0-4-3-8-3-12 0Zm-7 10c3 4 7 5 12 4-3-4-7-5-12-4Z" /></svg>;
  if (name === "badge") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="M32 6 38 12l8-1 3 8 7 5-4 8 4 8-7 5-3 8-8-1-6 6-6-6-8 1-3-8-7-5 4-8-4-8 7-5 3-8 8 1 6-6Z" /><path className={common} d="m22 33 7 7 14-17" /></svg>;
  if (name === "spark") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="M30 6c4 15 9 20 24 24-15 4-20 9-24 24-4-15-9-20-24-24 15-4 20-9 24-24Z" /><path className={common} d="M50 4c2 7 4 9 11 11-7 2-9 4-11 11-2-7-4-9-11-11 7-2 9-4 11-11Z" /></svg>;
  if (name === "handshake") return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><path className={common} d="m25 35 7 7c2 2 5 2 7 0l13-13" /><path className={common} d="M12 25 24 13l11 11-12 12L12 25Zm40 0L40 13l-9 9 17 17 4-4c3-3 3-7 0-10Z" /><path className={common} d="m20 39 8 8m-2-14 9 9m-3-15 10 10" /></svg>;
  if (name === "phone") return <svg viewBox="0 0 24 24" className={className}><path className={common} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1.1.4 2.2.7 3.2a2 2 0 0 1-.5 2.1L8.1 10.2a16 16 0 0 0 5.7 5.7l1.2-1.2a2 2 0 0 1 2.1-.5c1 .3 2.1.6 3.2.7a2 2 0 0 1 1.7 2Z" /></svg>;
  if (name === "mail") return <svg viewBox="0 0 24 24" className={className}><path className={common} d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path className={common} d="m22 6-10 7L2 6" /></svg>;
  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/90"><span>{label}</span>{children}</label>;
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`form-input ${props.className ?? ""}`} />; }
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`form-input min-h-28 resize-none ${props.className ?? ""}`} />; }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`form-input ${props.className ?? ""}`} />; }

export default function NordicAutoCareApp({ mode = "frontend", employeeToken = "" }: { mode?: "frontend" | "backend" | "employee"; employeeToken?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [invoice, setInvoice] = useState<InvoiceInfo>(emptyInvoice);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackNote, setCallbackNote] = useState("");
  const [callbackExpanded, setCallbackExpanded] = useState(false);
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const [quoteFiles, setQuoteFiles] = useState<string[]>([]);
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
  const [openCarIds, setOpenCarIds] = useState<Record<string, boolean>>({});
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    phone: "",
    email: "",
    fromAddress: "",
    fromPostcode: "",
    fromCity: "",
    fromFloor: "",
    fromElevator: "Nej",
    toAddress: "",
    toPostcode: "",
    toCity: "",
    toFloor: "",
    toElevator: "Nej",
    moveDate: "",
    packing: "Nej",
    homeSize: "",
    moveType: "Komplet flytning",
    storage: "Nej",
    comment: ""
  });
  const [cars, setCars] = useState<CarEntry[]>([makeCar()]);
  const [activeStatus, setActiveStatus] = useState<OrderStatus | "Alle">("Alle");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [submittedId, setSubmittedId] = useState<string>("");
  const [adminView, setAdminView] = useState<AdminView>("newOrders");
  const [searchTerm, setSearchTerm] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const isBackend = mode === "backend";
  const isEmployee = mode === "employee";
  const snapScrollLockRef = useRef(false);
  const snapTouchStartRef = useRef<{ y: number; target: EventTarget | null } | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [draftSummaryOpen, setDraftSummaryOpen] = useState(false);
  const [serviceDrafts, setServiceDrafts] = useState(() => ({ services: services.map((item) => ({ ...item, draft: false })), extras: extras.map((item) => ({ ...item, draft: false })), packages: packages.map((item) => ({ ...item, draft: false, description: item.items.join(", ") })) }));
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Lokal lagring");

  useEffect(() => {
    if (!isBackend) return;
    setAdminUnlocked(sessionStorage.getItem("nac-admin-unlocked") === "true");
  }, [isBackend]);

  function unlockBackend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adminPin.trim() === "2026") {
      sessionStorage.setItem("nac-admin-unlocked", "true");
      setAdminUnlocked(true);
      setAdminPin("");
    }
  }

  function lockBackend() {
    sessionStorage.removeItem("nac-admin-unlocked");
    setAdminUnlocked(false);
  }

  useEffect(() => {
    let cancelled = false;

    function applyState(data: PersistentState | null) {
      if (!data) return;
      if (data.orders) {
        const parsed = data.orders.map(normaliseOrder);
        setOrders(parsed);
        setSelectedOrderId(parsed[0]?.id ?? "");
      }
      if (data.invoices) {
        const parsedInvoices = data.invoices.map(normaliseInvoice);
        setInvoices(parsedInvoices);
        setSelectedInvoiceId(parsedInvoices[0]?.id ?? "");
      }
      if (data.serviceDrafts) {
        const parsedCatalog = normaliseCatalog(data.serviceDrafts);
        if (parsedCatalog.services) services = parsedCatalog.services.filter((item: Service) => !item.draft);
        if (parsedCatalog.extras) extras = parsedCatalog.extras.filter((item: Extra) => !item.draft);
        if (parsedCatalog.packages) packages = parsedCatalog.packages.filter((item: CarePackage) => !item.draft);
        setServiceDrafts(parsedCatalog as any);
      }
      if (data.companyInfo) setCompanyInfo({ ...defaultCompanyInfo, ...data.companyInfo });
      if (data.employees) setEmployees(data.employees);
      if (data.timeEntries) setTimeEntries(data.timeEntries);
    }

    async function loadInitialData() {
      let localState: PersistentState = {};
      try {
        const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (stored) localState.orders = (JSON.parse(stored) as Order[]).map(normaliseOrder);
      } catch { localState.orders = []; }
      try {
        const storedInvoices = localStorage.getItem(INVOICE_STORAGE_KEY);
        if (storedInvoices) localState.invoices = (JSON.parse(storedInvoices) as InvoiceRecord[]).map(normaliseInvoice);
      } catch { localState.invoices = []; }
      try {
        const storedCatalog = localStorage.getItem(SERVICE_DRAFTS_KEY);
        if (storedCatalog) localState.serviceDrafts = normaliseCatalog(JSON.parse(storedCatalog));
      } catch {}
      try {
        const storedCompany = localStorage.getItem(COMPANY_INFO_KEY);
        if (storedCompany) localState.companyInfo = { ...defaultCompanyInfo, ...JSON.parse(storedCompany) };
      } catch {}
      try {
        const storedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
        if (storedEmployees) localState.employees = JSON.parse(storedEmployees);
      } catch {}
      try {
        const storedTimeEntries = localStorage.getItem(TIME_ENTRIES_STORAGE_KEY);
        if (storedTimeEntries) localState.timeEntries = JSON.parse(storedTimeEntries);
      } catch {}

      if (supabaseConfigured()) {
        try {
          setSyncStatus("Henter fra Supabase...");
          const cloudState = await loadSupabaseState();
          if (!cancelled && cloudState) {
            applyState(cloudState);
            setSyncStatus("Supabase synkroniseret");
          } else if (!cancelled) {
            applyState(localState);
            await saveSupabaseState(localState);
            setSyncStatus("Supabase oprettet");
          }
        } catch (error) {
          console.error(error);
          if (!cancelled) {
            applyState(localState);
            setSyncStatus("Supabase fejl - bruger lokal backup");
          }
        }
      } else if (!cancelled) {
        applyState(localState);
        setSyncStatus("Lokal lagring - Supabase ikke konfigureret");
      }

      if (!cancelled) setDataLoaded(true);
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    services = serviceDrafts.services.filter((item) => !item.draft);
    extras = serviceDrafts.extras.filter((item) => !item.draft);
    packages = serviceDrafts.packages.filter((item) => !item.draft);
  }, [serviceDrafts]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(invoices));
    localStorage.setItem(SERVICE_DRAFTS_KEY, JSON.stringify(serviceDrafts));
    localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(companyInfo));
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
    localStorage.setItem(TIME_ENTRIES_STORAGE_KEY, JSON.stringify(timeEntries));

    if (!supabaseConfigured()) {
      setSyncStatus("Lokal lagring - Supabase ikke konfigureret");
      return;
    }

    const syncTimer = window.setTimeout(() => {
      setSyncStatus("Gemmer i Supabase...");
      saveSupabaseState({ orders, invoices, serviceDrafts, companyInfo, employees, timeEntries })
        .then(() => setSyncStatus(`Supabase gemt ${new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`))
        .catch((error) => { console.error(error); setSyncStatus("Supabase fejl - lokal backup gemt"); });
    }, 650);

    return () => window.clearTimeout(syncTimer);
  }, [orders, invoices, serviceDrafts, companyInfo, employees, timeEntries, dataLoaded]);

  const draftTotal = useMemo(() => orderTotal({ cars }), [cars]);
  const draftStarted = useMemo(() => {
    if (isBackend) return false;
    const hasCustomerInfo = Object.values(customer).some((value) => value.trim());
    const hasInvoiceInfo = Object.values(invoice).some((value) => value.trim() && value !== "Faktura");
    const hasTimeInfo = Boolean(preferredDate || preferredTime || customerMessage.trim());
    const hasCarInfo = cars.some((car) => car.services.length || car.extras.length || car.notes.trim() || car.packageId !== "basis" || car.type !== "Transport" || car.uploads.length) || cars.length > 1;
    return draftTotal > 0 || hasCustomerInfo || hasInvoiceInfo || hasTimeInfo || hasCarInfo;
  }, [cars, customer, customerMessage, draftTotal, invoice, isBackend, preferredDate, preferredTime]);

  useEffect(() => {
    if (isBackend || isEmployee) return;

    const getSections = () => Array.from(document.querySelectorAll<HTMLElement>("[data-snap-section]"));

    const getCurrentIndex = (sections: HTMLElement[]) => {
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let currentIndex = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section, index) => {
        const center = section.offsetTop + section.offsetHeight / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          currentIndex = index;
        }
      });

      return currentIndex;
    };

    const canScrollInside = (target: EventTarget | null, deltaY: number) => {
      let node = target instanceof HTMLElement ? target : null;

      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const canScroll = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 2;
        if (canScroll) {
          const atTop = node.scrollTop <= 2;
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 2;
          if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
        }
        node = node.parentElement;
      }

      return false;
    };

    const scrollToSection = (direction: 1 | -1) => {
      if (snapScrollLockRef.current) return;
      const sections = getSections();
      if (!sections.length) return;

      const currentIndex = getCurrentIndex(sections);
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));
      if (nextIndex === currentIndex) return;

      snapScrollLockRef.current = true;
      sections[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => { snapScrollLockRef.current = false; }, 780);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18) return;
      if (canScrollInside(event.target, event.deltaY)) return;
      event.preventDefault();
      scrollToSection(event.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      snapTouchStartRef.current = { y: event.touches[0]?.clientY ?? 0, target: event.target };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = snapTouchStartRef.current;
      snapTouchStartRef.current = null;
      if (!start) return;

      const endY = event.changedTouches[0]?.clientY ?? start.y;
      const deltaY = start.y - endY;
      if (Math.abs(deltaY) < 48) return;
      if (canScrollInside(start.target, deltaY)) return;

      event.preventDefault();
      scrollToSection(deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;

      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        scrollToSection(1);
      }

      if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        scrollToSection(-1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isBackend, isEmployee]);

  const searchedOrders = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const byStatus = activeStatus === "Alle" ? orders : orders.filter((order) => order.status === activeStatus);
    if (!needle) return byStatus;
    return byStatus.filter((order) => [order.id, order.customer.name, order.customer.phone, order.customer.email, order.customer.address, order.invoice.company, ...order.cars.flatMap((car) => [car.makeModel, car.reg, car.type])].join(" ").toLowerCase().includes(needle));
  }, [activeStatus, orders, searchTerm]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const kpis = useMemo(() => {
    const active = orders.filter((order) => !["Udført", "Færdig", "Faktura sendt", "Faktureret", "Betaling modtaget", "Annulleret"].includes(order.status));
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: orders.length,
      active: active.length,
      today: orders.filter((order) => (order.adminDate || order.preferredDate) === today).length,
      cars: orders.reduce((sum, order) => sum + order.cars.length, 0),
      value: orders.reduce((sum, order) => sum + orderTotal(order), 0),
      unpaid: invoices.filter((invoice) => invoice.status !== "Betalt" && invoice.status !== "Annulleret").reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
      invoices: invoices.length
    };
  }, [invoices, orders]);
  const calendarDays = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.filter((order) => ["Bekræftet", "Planlagt", "I gang"].includes(order.status)).forEach((order) => {
      const date = order.adminDate || order.preferredDate || "Ikke planlagt";
      map.set(date, [...(map.get(date) ?? []), order]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [orders]);
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email: string; orders: number; cars: number; value: number; last: string }>();
    orders.forEach((order) => {
      const key = order.customer.phone || order.customer.email || order.customer.name || order.id;
      const current = map.get(key) ?? { name: order.customer.name || "Ukendt kunde", phone: order.customer.phone, email: order.customer.email, orders: 0, cars: 0, value: 0, last: order.createdAt };
      current.orders += 1;
      current.cars += order.cars.length;
      current.value += orderTotal(order);
      current.last = order.createdAt > current.last ? order.createdAt : current.last;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.last.localeCompare(a.last));
  }, [orders]);

  function updateCar(id: string, patch: Partial<CarEntry>) { setCars((current) => current.map((car) => car.id === id ? { ...car, ...patch } : car)); }
  function toggleCarArray(carId: string, key: "services" | "extras", itemId: string) {
    setCars((current) => current.map((car) => {
      if (car.id !== carId) return car;
      const exists = car[key].includes(itemId);
      return { ...car, [key]: exists ? car[key].filter((id) => id !== itemId) : [...car[key], itemId] };
    }));
  }
  function submitCallback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = [`Ring mig op`, callbackNote ? `Note: ${callbackNote}` : ""].filter(Boolean).join("\n");
    const newOrder: Order = {
      id: `ØS-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      customer: { ...emptyCustomer, name: callbackName, phone: callbackPhone },
      invoice: emptyInvoice,
      preferredDate: "",
      preferredTime: "",
      cars: [{ ...makeCar(), makeModel: "Bliv ringet op", notes: note, services: ["courier"], extras: [] }],
      status: "Ny",
      paymentStatus: "Ikke faktureret",
      priority: "Normal",
      assignedTo: "",
      adminDate: "",
      adminTime: "",
      adminNotes: "",
      customerMessage: note,
      activity: [`Ring-op forespørgsel modtaget ${new Date().toLocaleString("da-DK")}`]
    };
    setOrders((current) => [newOrder, ...current]);
    setSelectedOrderId(newOrder.id);
    setSubmittedId(newOrder.id);
    setCallbackName("");
    setCallbackPhone("");
    setCallbackNote("");
    setCallbackExpanded(false);
  }

  function submitMovingQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const movingDetails = [
      "Gratis flyttetilbud",
      `Fra: ${quoteForm.fromAddress}, ${quoteForm.fromPostcode} ${quoteForm.fromCity}`,
      `Fra etage: ${quoteForm.fromFloor || "ikke angivet"} · elevator: ${quoteForm.fromElevator}`,
      `Til: ${quoteForm.toAddress}, ${quoteForm.toPostcode} ${quoteForm.toCity}`,
      `Til etage: ${quoteForm.toFloor || "ikke angivet"} · elevator: ${quoteForm.toElevator}`,
      `Dato: ${quoteForm.moveDate || "ikke valgt"}`,
      `Nedpakning: ${quoteForm.packing}`,
      `Bolig m2: ${quoteForm.homeSize || "ikke angivet"}`,
      `Type: ${quoteForm.moveType}`,
      `Opbevaring: ${quoteForm.storage}`,
      quoteForm.comment ? `Kommentar: ${quoteForm.comment}` : "",
      quoteFiles.length ? `Billeder: ${fileNameSummary(quoteFiles)}` : ""
    ].filter(Boolean).join("\n");

    const newOrder: Order = {
      id: `ØS-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      customer: { ...emptyCustomer, name: quoteForm.name, phone: quoteForm.phone, email: quoteForm.email, address: quoteForm.fromAddress },
      invoice: { ...emptyInvoice, invoiceEmail: quoteForm.email, invoiceAddress: quoteForm.fromAddress, paymentMethod: "Faktura", customerType: "Flyttetilbud" },
      preferredDate: quoteForm.moveDate,
      preferredTime: "",
      cars: [{ ...makeCar(), type: "Flytning", makeModel: `Flyttetilbud · ${quoteForm.homeSize || "?"} m2`, notes: movingDetails, uploads: quoteFiles, services: ["moving-full"], extras: quoteForm.packing === "Ja" ? ["extra-helper"] : [] }],
      status: "Ny",
      paymentStatus: "Ikke faktureret",
      priority: "Normal",
      assignedTo: "",
      adminDate: quoteForm.moveDate,
      adminTime: "",
      adminNotes: "",
      customerMessage: movingDetails,
      activity: [`Flyttetilbud modtaget ${new Date().toLocaleString("da-DK")}`]
    };
    setOrders((current) => [newOrder, ...current]);
    setSelectedOrderId(newOrder.id);
    setSubmittedId(newOrder.id);
    setQuoteForm({
      name: "",
      phone: "",
      email: "",
      fromAddress: "",
      fromPostcode: "",
      fromCity: "",
      fromFloor: "",
      fromElevator: "Nej",
      toAddress: "",
      toPostcode: "",
      toCity: "",
      toFloor: "",
      toElevator: "Nej",
      moveDate: "",
      packing: "Nej",
      homeSize: "",
      moveType: "Komplet flytning",
      storage: "Nej",
      comment: ""
    });
    setQuoteFiles([]);
    setQuoteExpanded(false);
  }

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const preparedCars = cars.map((car) => ({
      ...car,
      notes: [car.notes, car.uploads.length ? `Billeder: ${fileNameSummary(car.uploads)}` : ""].filter(Boolean).join("\n")
    }));
    const requestMessage = preparedCars.map((car, index) => `Opgave ${index + 1}: ${[car.type, car.notes].filter(Boolean).join(" · ")}`).join("\n");
    const newOrder: Order = {
      id: `ØS-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      customer,
      invoice,
      preferredDate,
      preferredTime,
      cars: preparedCars,
      status: "Ny",
      paymentStatus: "Ikke faktureret",
      priority: "Normal",
      assignedTo: "",
      adminDate: preferredDate,
      adminTime: preferredTime,
      adminNotes: "",
      customerMessage: requestMessage || customerMessage,
      activity: [`Forespørgsel modtaget ${new Date().toLocaleString("da-DK")}`]
    };
    setOrders((current) => [newOrder, ...current]);
    setSelectedOrderId(newOrder.id);
    setSubmittedId(newOrder.id);
    setCustomer(emptyCustomer);
    setInvoice(emptyInvoice);
    setPreferredDate("");
    setPreferredTime("");
    setCustomerMessage("");
    setCars([makeCar()]);
    setOpenCarIds({});
    setCustomerInfoOpen(false);
    setDraftSummaryOpen(false);
  }
  function createEmployee(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const name = newEmployeeName.trim();
    if (!name) return;
    const employee: Employee = { id: cryptoId(), name, token: cryptoId().replaceAll("-", ""), active: true, createdAt: new Date().toISOString() };
    setEmployees((current) => [employee, ...current]);
    setNewEmployeeName("");
  }

  function updateEmployee(id: string, patch: Partial<Employee>) {
    setEmployees((current) => current.map((employee) => employee.id === id ? { ...employee, ...patch } : employee));
  }

  function employeeLink(employee: Employee) {
    if (typeof window === "undefined") return `/employee/${employee.token}`;
    return `${window.location.origin}/employee/${employee.token}`;
  }

  async function copyEmployeeLink(employee: Employee) {
    const link = employeeLink(employee);
    try {
      await navigator.clipboard.writeText(link);
      alert("Link kopieret");
    } catch {
      alert("Link kopieret");
    }
  }

  function addTimeEntry(employee: Employee, entry: Omit<TimeEntry, "id" | "employeeId" | "employeeName" | "createdAt" | "kind">) {
    const fullEntry: TimeEntry = {
      ...entry,
      id: cryptoId(),
      employeeId: employee.id,
      employeeName: employee.name,
      createdAt: new Date().toISOString(),
      kind: "work"
    };
    setTimeEntries((current) => [fullEntry, ...current]);
  }

  function removeEmployeeHours(employee: Employee, hours: number, note: string) {
    if (!hours || hours <= 0) return;
    const entry: TimeEntry = {
      id: cryptoId(),
      employeeId: employee.id,
      employeeName: employee.name,
      date: new Date().toISOString().slice(0, 10),
      startTime: "",
      endTime: "",
      taskName: "Timer fjernet",
      note: note || "Manuel justering",
      hours: -Math.abs(hours),
      createdAt: new Date().toISOString(),
      kind: "adjustment"
    };
    setTimeEntries((current) => [entry, ...current]);
  }

  function updateOrder(id: string, patch: Partial<Order>, activity?: string) {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, ...patch, activity: activity ? [`${new Date().toLocaleString("da-DK")}: ${activity}`, ...(order.activity ?? [])] : order.activity } : order));
  }
  function updateOrderCustomer(id: string, patch: Partial<CustomerInfo>) {
    const order = orders.find((item) => item.id === id); if (!order) return;
    updateOrder(id, { customer: { ...order.customer, ...patch } }, "Kundeinfo opdateret");
  }
  function updateOrderInvoice(id: string, patch: Partial<InvoiceInfo>) {
    const order = orders.find((item) => item.id === id); if (!order) return;
    updateOrder(id, { invoice: { ...order.invoice, ...patch } }, "Fakturainfo opdateret");
  }
  function updateOrderCar(orderId: string, carId: string, patch: Partial<CarEntry>) {
    const order = orders.find((item) => item.id === orderId); if (!order) return;
    updateOrder(orderId, { cars: order.cars.map((car) => car.id === carId ? { ...car, ...patch } : car) }, "Opgave opdateret");
  }
  function toggleOrderCarArray(orderId: string, carId: string, key: "services" | "extras", itemId: string) {
    const order = orders.find((item) => item.id === orderId); const car = order?.cars.find((item) => item.id === carId); if (!order || !car) return;
    const exists = car[key].includes(itemId);
    updateOrderCar(orderId, carId, { [key]: exists ? car[key].filter((id) => id !== itemId) : [...car[key], itemId] } as Partial<CarEntry>);
  }
  function addCarToOrder(orderId: string) {
    const order = orders.find((item) => item.id === orderId); if (!order) return;
    updateOrder(orderId, { cars: [...order.cars, makeCar()] }, "Opgave tilføjet");
  }
  function removeCarFromOrder(orderId: string, carId: string) {
    const order = orders.find((item) => item.id === orderId); if (!order || order.cars.length <= 1) return;
    updateOrder(orderId, { cars: order.cars.filter((car) => car.id !== carId) }, "Opgave fjernet");
  }
  function deleteOrder(id: string) {
    const next = orders.filter((order) => order.id !== id);
    setOrders(next); if (selectedOrderId === id) setSelectedOrderId(next[0]?.id ?? "");
  }
  function createInvoiceFromOrder(order: Order) {
    const today = new Date();
    const due = new Date(today);
    due.setDate(today.getDate() + 8);
    const lines: InvoiceLine[] = order.cars.map((car, index) => {
      const pack = packages.find((item) => item.id === car.packageId);
      const label = [`Opgave ${index + 1}`, car.makeModel, car.reg, pack?.title].filter(Boolean).join(" · ");
      return { id: cryptoId(), text: label, qty: 1, price: carTotal(car) };
    });
    const invoice: InvoiceRecord = {
      id: `INV-${String(Date.now()).slice(-6)}`,
      orderId: order.id,
      invoiceNo: `ØS-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`,
      createdAt: today.toISOString(),
      dueDate: due.toISOString().slice(0, 10),
      customerName: order.customer.name,
      email: order.invoice.invoiceEmail || order.customer.email,
      invoiceAddress: order.invoice.invoiceAddress || order.customer.address,
      company: order.invoice.company,
      cvr: order.invoice.cvr,
      status: "Kladde",
      lines,
      note: "Tak for din ordre hos Ølands Service."
    };
    setInvoices((current) => [invoice, ...current]);
    setSelectedInvoiceId(invoice.id);
    setAdminView("invoices");
    updateOrder(order.id, { paymentStatus: "Ikke faktureret" }, `Faktura ${invoice.invoiceNo} oprettet som kladde`);
  }

  function updateInvoice(id: string, patch: Partial<InvoiceRecord>) {
    setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, ...patch } : invoice));
  }

  function sendInvoice(id: string) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    const subject = encodeURIComponent(`Faktura ${invoice.invoiceNo} fra Ølands Service`);
    const body = encodeURIComponent(invoiceEmailBody(invoice));
    if (invoice.email) window.location.href = `mailto:${invoice.email}?subject=${subject}&body=${body}`;
    updateInvoice(id, { status: "Sendt", sentAt: new Date().toISOString() });
    updateOrder(invoice.orderId, { status: "Faktura sendt", paymentStatus: "Faktura sendt" }, `Faktura ${invoice.invoiceNo} markeret som sendt`);
  }

  function markInvoicePaid(id: string) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    updateInvoice(id, { status: "Betalt", paidAt: new Date().toISOString() });
    updateOrder(invoice.orderId, { status: "Betaling modtaget", paymentStatus: "Betalt" }, `Faktura ${invoice.invoiceNo} markeret som betalt`);
  }

  function deleteInvoice(id: string) {
    const next = invoices.filter((invoice) => invoice.id !== id);
    setInvoices(next);
    if (selectedInvoiceId === id) setSelectedInvoiceId(next[0]?.id ?? "");
  }

  function orderEmailBody(order: Order) {
    const carLines = order.cars.map((car, index) => {
      const pack = packages.find((item) => item.id === car.packageId);
      const serviceNames = selectedNames(car.services, services);
      const extraNames = selectedNames(car.extras, extras);
      return [`Opgave ${index + 1}: ${car.type}`, car.makeModel ? `Beskrivelse: ${car.makeModel}` : "", car.reg ? `Reference: ${car.reg}` : "", pack ? `Pakke: ${pack.title} (${kr(pack.price)})` : "", serviceNames ? `Ydelser: ${serviceNames}` : "", extraNames ? `Tillæg: ${extraNames}` : "", car.notes ? `Noter: ${car.notes}` : ""].filter(Boolean).join("\n");
    }).join("\n\n");
    return [`Hej ${order.customer.name || ""}`, "", "Vi har gennemgået og bekræftet din forespørgsel hos Ølands Service.", "", `Ordre: ${order.id}`, `Dato/tid: ${order.adminDate || order.preferredDate || "aftales"} ${order.adminTime || order.preferredTime || ""}`.trim(), "", carLines, "", `Estimeret total: ${kr(orderTotal(order))}`, "", "Svar gerne på denne mail, hvis noget skal ændres.", "", "Med venlig hilsen", companyInfo.name].join("\n");
  }

  function acceptOrder(id: string) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    updateOrder(id, { status: "Bekræftet" }, "Ordre accepteret og bekræftelsesmail klargjort");
    const email = order.customer.email;
    if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Ordrebekræftelse ${order.id} fra ${companyInfo.name}`)}&body=${encodeURIComponent(orderEmailBody(order))}`;
  }

  function updateServiceDraft(kind: "services" | "extras" | "packages", id: string, patch: Partial<Service & Extra & CarePackage>) {
    setServiceDrafts((current) => ({ ...current, [kind]: current[kind].map((item: any) => item.id === id ? { ...item, ...patch, draft: true } : item) }));
  }

  function addServiceDraft(kind: "services" | "extras" | "packages") {
    const base: any = kind === "packages" ? { id: cryptoId(), title: "Ny pakke", price: 0, items: ["Ny ydelse"], icon: "shield", description: "", draft: true } : { id: cryptoId(), name: kind === "extras" ? "Nyt tillæg" : "Ny ydelse", price: 0, note: "", description: "", draft: true };
    setServiceDrafts((current) => ({ ...current, [kind]: [base, ...current[kind]] }));
  }

  function publishServices() {
    setServiceDrafts((current) => ({ services: current.services.map((item) => ({ ...item, draft: false })), extras: current.extras.map((item) => ({ ...item, draft: false })), packages: current.packages.map((item) => ({ ...item, draft: false })) }));
  }

  function exportOrders() {
    const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `oland-service-orders-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function importOrders(file?: File) {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text) as Order[];
    setOrders(parsed.map(normaliseOrder));
    setSelectedOrderId(parsed[0]?.id ?? "");
  }

  const activeEmployee = employees.find((employee) => employee.token === employeeToken && employee.active);
  const employeeEntries = activeEmployee ? timeEntries.filter((entry) => entry.employeeId === activeEmployee.id) : [];

  if (isEmployee) {
    return <EmployeeHourPage employee={activeEmployee} entries={employeeEntries} onAddEntry={addTimeEntry} dataLoaded={dataLoaded} syncStatus={syncStatus} />;
  }

  if (isBackend && !adminUnlocked) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-stone-50">
        <div className="splash-screen" aria-hidden="true"><Image src="/images/oland-service-logo.png" alt="" width={1931} height={778} priority sizes="70vw" className="splash-logo" /></div>
        <div className="fixed inset-0 -z-10 bg-black" />
        <div className="noise fixed inset-0 -z-10 opacity-35" />
        <nav className="fixed inset-x-0 top-0 z-50 bg-black px-4 pb-2.5 sm:px-8" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <a href="/" className="relative block h-7 w-28 shrink-0 overflow-hidden sm:h-8 sm:w-36"><Image src="/images/oland-service-top-logo.jpeg" alt="Øland Service" fill sizes="144px" className="object-contain object-left" /></a>
            <a className="nav-pill" href="/">Kundeside</a>
          </div>
        </nav>
        <section className="mx-auto grid min-h-screen w-full max-w-md content-start px-5 pb-10 pt-28 sm:pt-32">
          <form onSubmit={unlockBackend} className="grid gap-4">
            <Field label="Admin PIN"><TextInput type="password" inputMode="numeric" value={adminPin} onChange={(event) => setAdminPin(event.target.value)} placeholder="PIN" autoFocus /></Field>
            <button type="submit" className="gold-button w-full">Åbn backend</button>
          </form>
          <a href="/" className="outline-button mt-4 w-full">Gå til kundesiden</a>
          {adminPin && adminPin.trim() !== "2026" && <p className="mt-4 text-sm text-red-200">Forkert PIN.</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-stone-50">
      <div className="splash-screen" aria-hidden="true"><Image src="/images/oland-service-logo.png" alt="" width={1931} height={778} priority sizes="70vw" className="splash-logo" /></div>
      <div className="fixed inset-0 -z-10 bg-black" />
      <div className="noise fixed inset-0 -z-10 opacity-35" />

      <nav className="fixed inset-x-0 top-0 z-50 bg-black px-4 pb-2.5 sm:px-8" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <a href="#top" className="relative block h-7 w-28 shrink-0 overflow-hidden sm:h-8 sm:w-36"><Image src="/images/oland-service-top-logo.jpeg" alt="Øland Service" fill sizes="144px" className="object-contain object-left" /></a>
          <div className="flex gap-4 overflow-x-auto text-[0.62rem] font-black uppercase tracking-[0.18em] text-stone-200/80 sm:text-[0.68rem]">
            {isBackend ? <><a className="nav-pill" href="/">Kundeside</a><button type="button" className="nav-pill" onClick={lockBackend}>Lås backend</button></> : <><a className="nav-pill" href="#action">Kontakt</a><a className="nav-pill" href="#action">Book</a><a className="nav-pill" href="#priser">Services</a></>}
          </div>
        </div>
      </nav>

      <div className={isBackend ? "pt-24 sm:pt-24" : ""}>
      {!isBackend && <>
      <section id="top" data-snap-section className="snap-section landing-section relative grid place-items-center px-5 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="landing-title text-white">
            <span>Transport</span>
            <span>Og logistik</span>
            <span>I sikre</span>
            <span>Hænder</span>
          </h1>
          <p className="landing-subtitle">Kvalitet . Omhu . Tillid</p>
        </div>
        <a href="#services-overview" className="section-chevron section-chevron-bottom" aria-label="Gå til services"><span className="section-chevron-label">Services</span><span className="chevron bottom" aria-hidden="true"></span></a>
      </section>

      <section id="services-overview" data-snap-section className="snap-section section-panel px-5 sm:px-8 lg:px-12">
        <div className="mx-auto grid h-full max-w-3xl content-center gap-6 text-center">
          <div>
            <p className="eyebrow">Services</p>
            <h2 className="section-title mt-3">Hvad Øland Service hjælper med</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="service-intro-card">
              <h3>Flytning</h3>
              <p>Tekst kommer senere.</p>
            </article>
            <article className="service-intro-card">
              <h3>Transport</h3>
              <p>Tekst kommer senere.</p>
            </article>
            <article className="service-intro-card">
              <h3>Opbevaring</h3>
              <p>Tekst kommer senere.</p>
            </article>
          </div>
        </div>
        <a href="#top" className="section-chevron section-chevron-top" aria-label="Gå til landing"><span className="chevron" aria-hidden="true"></span><span className="section-chevron-label">Landing</span></a>
        <a href="#action" className="section-chevron section-chevron-bottom" aria-label="Gå til kontakt"><span className="section-chevron-label">Kontakt</span><span className="chevron bottom" aria-hidden="true"></span></a>
      </section>

      <section id="action" data-snap-section className="snap-section action-section section-panel px-5 sm:px-8 lg:px-12">
        <div className="mx-auto grid h-full max-w-3xl content-center gap-3">
          {submittedId && <div className="rounded-2xl border border-white/40 bg-white/[0.08] p-3 text-xs text-stone-100">Forespørgsel <strong className="text-white">{submittedId}</strong> er oprettet i backend.</div>}
          <div className="grid gap-3">
            <a href="tel:+4526848789" className="panel cta-card block p-4 sm:p-5">
              <div><h3 className="text-xl font-black uppercase tight-card-title text-white sm:text-2xl">Ring til Øland</h3></div>
            </a>

            <article className="panel p-4 sm:p-5">
              <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setCallbackExpanded((open) => !open)}>
                <div><h3 className="text-xl font-black uppercase tight-card-title text-white sm:text-2xl">Bliv ringet op</h3></div>
                <span className={`chevron-toggle ${callbackExpanded ? "is-open" : ""}`}>›</span>
              </button>
              {callbackExpanded && <form onSubmit={submitCallback} className="mt-3 grid max-h-[38svh] gap-3 overflow-y-auto pr-1">
                <Field label="Navn"><TextInput value={callbackName} onChange={(event) => setCallbackName(event.target.value)} placeholder="Fulde navn" required /></Field>
                <Field label="Telefon"><TextInput inputMode="tel" value={callbackPhone} onChange={(event) => setCallbackPhone(event.target.value)} placeholder="26848789" required /></Field>
                <Field label="Note"><TextArea value={callbackNote} onChange={(event) => setCallbackNote(event.target.value)} placeholder="Hvornår skal vi ringe? Hvad handler det om?" /></Field>
                <button type="submit" className="gold-button w-full">Bliv ringet op</button>
              </form>}
            </article>

            <article className="panel p-4 sm:p-5">
              <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setQuoteExpanded((open) => !open)}>
                <div><h3 className="text-xl font-black uppercase tight-card-title text-white sm:text-2xl">Gratis flyttetilbud</h3></div>
                <span className={`chevron-toggle ${quoteExpanded ? "is-open" : ""}`}>›</span>
              </button>
              {quoteExpanded && <form onSubmit={submitMovingQuote} className="mt-3 grid max-h-[42svh] gap-3 overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Navn"><TextInput value={quoteForm.name} onChange={(event) => setQuoteForm({ ...quoteForm, name: event.target.value })} required /></Field>
                  <Field label="Telefon"><TextInput inputMode="tel" value={quoteForm.phone} onChange={(event) => setQuoteForm({ ...quoteForm, phone: event.target.value })} required /></Field>
                </div>
                <Field label="Email"><TextInput type="email" value={quoteForm.email} onChange={(event) => setQuoteForm({ ...quoteForm, email: event.target.value })} required /></Field>

                <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
                  <div className="grid gap-3">
                    <Field label="Fra adresse"><TextInput value={quoteForm.fromAddress} onChange={(event) => setQuoteForm({ ...quoteForm, fromAddress: event.target.value })} required /></Field>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"><Field label="Postnr"><TextInput value={quoteForm.fromPostcode} onChange={(event) => setQuoteForm({ ...quoteForm, fromPostcode: event.target.value })} /></Field><Field label="By"><TextInput value={quoteForm.fromCity} onChange={(event) => setQuoteForm({ ...quoteForm, fromCity: event.target.value })} /></Field></div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"><Field label="Etage"><TextInput value={quoteForm.fromFloor} onChange={(event) => setQuoteForm({ ...quoteForm, fromFloor: event.target.value })} placeholder="fx 3. sal" /></Field><Field label="Elevator"><Select value={quoteForm.fromElevator} onChange={(event) => setQuoteForm({ ...quoteForm, fromElevator: event.target.value })}><option>Nej</option><option>Ja</option></Select></Field></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
                  <div className="grid gap-3">
                    <Field label="Til adresse"><TextInput value={quoteForm.toAddress} onChange={(event) => setQuoteForm({ ...quoteForm, toAddress: event.target.value })} required /></Field>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"><Field label="Postnr"><TextInput value={quoteForm.toPostcode} onChange={(event) => setQuoteForm({ ...quoteForm, toPostcode: event.target.value })} /></Field><Field label="By"><TextInput value={quoteForm.toCity} onChange={(event) => setQuoteForm({ ...quoteForm, toCity: event.target.value })} /></Field></div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"><Field label="Etage"><TextInput value={quoteForm.toFloor} onChange={(event) => setQuoteForm({ ...quoteForm, toFloor: event.target.value })} placeholder="fx st." /></Field><Field label="Elevator"><Select value={quoteForm.toElevator} onChange={(event) => setQuoteForm({ ...quoteForm, toElevator: event.target.value })}><option>Nej</option><option>Ja</option></Select></Field></div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field label="Flyttedato"><TextInput type="date" className="move-date-input" value={quoteForm.moveDate} onChange={(event) => setQuoteForm({ ...quoteForm, moveDate: event.target.value })} /></Field>
                  <Field label="Bolig m2"><TextInput inputMode="numeric" value={quoteForm.homeSize} onChange={(event) => setQuoteForm({ ...quoteForm, homeSize: event.target.value })} placeholder="fx 75" required /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field label="Nedpakning"><Select value={quoteForm.packing} onChange={(event) => setQuoteForm({ ...quoteForm, packing: event.target.value })}><option>Nej</option><option>Ja</option></Select></Field>
                  <Field label="Opbevaring"><Select value={quoteForm.storage} onChange={(event) => setQuoteForm({ ...quoteForm, storage: event.target.value })}><option>Nej</option><option>Ja</option></Select></Field>
                </div>
                <Field label="Type af flytning"><Select value={quoteForm.moveType} onChange={(event) => setQuoteForm({ ...quoteForm, moveType: event.target.value })}><option>Komplet flytning</option><option>Flyttekasser, få møbler</option><option>Kun flyttekasser</option><option>Klaver</option><option>Andet</option></Select></Field>
                <Field label="Upload billeder"><input type="file" multiple accept="image/*" className="form-input min-w-0 pt-3" onChange={(event) => setQuoteFiles(Array.from(event.target.files ?? []).map((file) => file.name))} /></Field>
                {quoteFiles.length > 0 && <p className="text-sm text-stone-300/70">{fileNameSummary(quoteFiles)}</p>}
                <Field label="Kommentar"><TextArea value={quoteForm.comment} onChange={(event) => setQuoteForm({ ...quoteForm, comment: event.target.value })} placeholder="Særlige forhold, adgang, parkering, tidsrum..." /></Field>
                <button type="submit" className="gold-button w-full">Send gratis flyttetilbud</button>
              </form>}
            </article>
          </div>

          <form id="booking-form" onSubmit={submitRequest} className="grid gap-3">
            <div className="grid gap-3">
              {cars.map((car, index) => {
                const open = Boolean(openCarIds[car.id]);
                return <article key={car.id} className="panel p-4 sm:p-5">
                  <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setOpenCarIds((current) => ({ ...current, [car.id]: !current[car.id] }))}>
                    <div><h3 className="text-[1.18rem] font-black uppercase tight-card-title text-white sm:text-2xl">Forespørgsel</h3></div>
                    <span className={`chevron-toggle ${open ? "is-open" : ""}`}>›</span>
                  </button>
                  {open && <><div className="mt-3 max-h-[36svh] overflow-y-auto pr-1"><CarEditor car={car} preferredDate={preferredDate} preferredTime={preferredTime} onDateChange={setPreferredDate} onTimeChange={setPreferredTime} onPatch={(patch) => updateCar(car.id, patch)} onToggle={(key, itemId) => toggleCarArray(car.id, key, itemId)} /></div><div className="mt-3 rounded-2xl border border-white/25 bg-black/35 p-3 text-right text-xs uppercase tracking-[0.12em] text-stone-300/80">Opgave {index + 1} total <strong className="ml-3 text-lg text-white">{kr(carTotal(car))}</strong></div></>}
                  {cars.length > 1 && <button type="button" className="small-danger mt-3" onClick={() => { setCars((current) => current.filter((item) => item.id !== car.id)); setOpenCarIds((current) => { const next = { ...current }; delete next[car.id]; return next; }); }}>Fjern</button>}
                </article>;
              })}
              <button type="button" className="outline-button w-full !tracking-[0.08em] !leading-tight" onClick={() => { const next = makeCar(); setCars((current) => [...current, next]); }}>+ Tilføj opgave</button>
            </div>
            <section className="panel p-4 sm:p-5">
              <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setCustomerInfoOpen((open) => !open)}>
                <div><p className="eyebrow tight-card-kicker">Registrer</p><h3 className="mt-1 text-[1.18rem] font-black uppercase tight-card-title text-white sm:text-2xl">Kundeinformation</h3></div>
                <span className={`chevron-toggle ${customerInfoOpen ? "is-open" : ""}`}>›</span>
              </button>
              {customerInfoOpen && <div className="mt-3 grid max-h-[34svh] gap-3 overflow-y-auto pr-1">
                <Field label="Navn"><TextInput required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Fulde navn" /></Field>
                <Field label="Telefon"><TextInput required value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="26848789" /></Field>
                <Field label="Email"><TextInput type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="kunde@email.dk" /></Field>
                <Field label="Adresse"><TextInput value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Afhentningsadresse / område" /></Field>
                <Field label="Betaling"><Select value={invoice.paymentMethod} onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value })}><option>Faktura</option><option>Kontant</option></Select></Field>
                <Field label="Type"><Select value={invoice.customerType || "Privat"} onChange={(e) => setInvoice({ ...invoice, customerType: e.target.value })}><option>Privat</option><option>Erhverv</option></Select></Field>
                <Field label="Faktura email"><TextInput type="email" value={invoice.invoiceEmail} onChange={(e) => setInvoice({ ...invoice, invoiceEmail: e.target.value })} placeholder="Hvis anden end kontakt email" /></Field>
              </div>}
            </section>
            <button type="submit" className="gold-button w-full">Send</button>
          </form>
        </div>
        <a href="#services-overview" className="section-chevron section-chevron-top" aria-label="Gå til services"><span className="chevron" aria-hidden="true"></span><span className="section-chevron-label">Services</span></a>
        <a href="#priser" className="section-chevron section-chevron-bottom" aria-label="Gå til priser"><span className="section-chevron-label">Priser</span><span className="chevron bottom" aria-hidden="true"></span></a>
      </section>

      <section id="priser" data-snap-section className="snap-section relative px-5 py-10 sm:px-8 lg:px-12"><a href="#action" className="section-chevron section-chevron-top" aria-label="Gå til forespørgsel"><span className="chevron" aria-hidden="true"></span><span className="section-chevron-label">Forespørgsel</span></a><div className="mx-auto max-w-7xl"><div className="mb-8 text-center"><p className="eyebrow">Ydelser</p><h2 className="mt-2 text-3xl font-semibold uppercase tracking-[0.22em] text-white sm:text-5xl">Transport og logistik</h2></div><div className="grid gap-7 lg:grid-cols-[.9fr_1.1fr]"><div className="panel p-4 sm:p-5"><h3 className="panel-title">Enkeltydelser</h3><div className="divide-y divide-white/18">{services.map((row) => <div key={row.id} className="flex items-start justify-between gap-5 py-2.5 text-[0.94rem] leading-tight sm:text-base"><span className="text-stone-100/90">{row.name}</span><span className="shrink-0 text-right font-medium tracking-wide text-stone-100/90">{kr(row.price)}</span></div>)}</div><p className="mt-6 text-sm leading-6 text-white/86">Priserne er fra-priser og kan variere afhængigt af opgavens omfang og afstand.</p><div className="mt-9"><h3 className="panel-title">Tillæg</h3><div className="divide-y divide-white/18">{extras.map((row) => <div key={row.id} className="flex items-start justify-between gap-5 py-2.5 text-[0.94rem] leading-tight sm:text-base"><span className="text-stone-100/90">{row.name}</span><span className="shrink-0 text-right font-medium tracking-wide text-stone-100/90">{row.note ?? kr(row.price)}</span></div>)}</div></div></div><div id="pakker" className="grid gap-4"><h3 className="panel-title mb-0">Pakkeløsninger</h3>{packages.map((pack) => <article key={pack.title} className="package-card"><div className="flex items-center gap-5"><Icon name={pack.icon} className="h-16 w-16 shrink-0 text-white sm:h-20 sm:w-20" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-xl font-semibold uppercase tracking-[0.14em] text-white sm:text-2xl">{pack.title}</h4><p className="text-2xl font-bold tracking-wide text-white sm:text-3xl">{kr(pack.price)}</p></div><ul className="mt-3 grid gap-1.5 text-sm leading-5 text-stone-100/86 sm:text-base">{pack.items.map((item) => <li key={item} className="flex gap-2"><span className="text-white">•</span><span>{item}</span></li>)}</ul></div></div></article>)}</div></div></div></section>
      </>}

      {isBackend && <section id="admin" className="backend-safe-bottom px-5 pt-6 sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl">
        {adminView === "newOrders" && <>
          <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="eyebrow">Åben backend</p><h2 className="mt-2 text-3xl font-semibold uppercase tracking-[0.18em] text-white sm:text-5xl">Order Operations</h2></div><a href="/" className="gold-button">Åbn kundeside</a></div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">{[{ label: "Nye", value: orders.filter((order) => order.status === "Ny").length }, { label: "Bekræftet", value: orders.filter((order) => ["Bekræftet", "Planlagt", "I gang"].includes(order.status)).length }, { label: "Udført", value: orders.filter((order) => order.status === "Udført").length }, { label: "Faktura sendt", value: orders.filter((order) => order.status === "Faktura sendt").length }, { label: "Betalt", value: orders.filter((order) => order.status === "Betaling modtaget").length }, { label: "Værdi", value: kr(kpis.value) }, { label: "Ikke betalt", value: kr(kpis.unpaid) }].map((item) => <div key={item.label} className="panel p-4"><p className="text-xs uppercase tracking-[0.22em] text-stone-400">{item.label}</p><p className="mt-2 text-2xl font-black text-white">{item.value}</p></div>)}</div>
        </>}
        <div className="admin-shell">

          {adminView === "newOrders" && <NewOrdersModule orders={orders.filter((order) => order.status === "Ny")} onAccept={acceptOrder} onUpdate={updateOrder} onUpdateCustomer={updateOrderCustomer} onUpdateInvoice={updateOrderInvoice} onUpdateCar={updateOrderCar} onToggleCarArray={toggleOrderCarArray} onAddCar={addCarToOrder} onRemoveCar={removeCarFromOrder} onDelete={deleteOrder} />}
          {adminView === "calendar" && <CalendarModule calendarDays={calendarDays} onUpdate={updateOrder} onSelect={(id) => setSelectedOrderId(id)} />}
          {adminView === "invoices" && <InvoiceModule orders={orders.filter((order) => ["Bekræftet", "Planlagt", "I gang", "Udført", "Faktura sendt"].includes(order.status))} invoices={invoices} selectedInvoiceId={selectedInvoiceId} onSelectInvoice={setSelectedInvoiceId} onCreateFromOrder={createInvoiceFromOrder} onUpdateInvoice={updateInvoice} onSendInvoice={sendInvoice} onMarkPaid={markInvoicePaid} onDeleteInvoice={deleteInvoice} />}
          {adminView === "completed" && <CompletedOrdersModule orders={orders.filter((order) => ["Udført", "Faktura sendt", "Betaling modtaget", "Færdig", "Faktureret"].includes(order.status))} onUpdate={updateOrder} onUpdateCustomer={updateOrderCustomer} onUpdateInvoice={updateOrderInvoice} onUpdateCar={updateOrderCar} onToggleCarArray={toggleOrderCarArray} onAddCar={addCarToOrder} onRemoveCar={removeCarFromOrder} onDelete={deleteOrder} />}
          {adminView === "services" && <ServicesModule drafts={serviceDrafts} onUpdate={updateServiceDraft} onAdd={addServiceDraft} onPublish={publishServices} />}
          {adminView === "company" && <CompanyInfoModule companyInfo={companyInfo} onChange={setCompanyInfo} />}
          {adminView === "employees" && <EmployeesModule employees={employees} timeEntries={timeEntries} newEmployeeName={newEmployeeName} onNameChange={setNewEmployeeName} onCreate={createEmployee} onUpdateEmployee={updateEmployee} onCopyLink={copyEmployeeLink} onRemoveHours={removeEmployeeHours} />}
          {adminView === "settings" && <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="panel p-6 lg:col-span-2"><h3 className="panel-title">Supabase</h3><p className="text-stone-300/75">Status: {syncStatus}</p><p className="mt-3 text-sm text-stone-400/80">Medarbejdere, timer, ordrer, fakturaer, ydelser og firmaoplysninger gemmes i Supabase, når miljøvariablerne er sat i Vercel. Ellers bruges lokal browserbackup.</p></section><section className="panel p-6"><h3 className="panel-title">Backup</h3><p className="text-stone-300/75">Eksporter alle ordrer til JSON, så data kan gemmes eller flyttes til en anden browser.</p><button className="gold-button mt-5 w-full" onClick={exportOrders}>Eksporter ordrer</button></section><section className="panel p-6"><h3 className="panel-title">Importer</h3><p className="text-stone-300/75">Importer en tidligere JSON backup. Dette erstatter de nuværende lokale ordrer.</p><input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => importOrders(e.target.files?.[0])} /><button className="outline-button mt-5 w-full" onClick={() => importRef.current?.click()}>Importer backup</button></section></div>}
          <nav className="admin-dock fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-1.25rem)] max-w-3xl -translate-x-1/2 items-stretch gap-2 overflow-x-auto rounded-[1.45rem] border border-white/35 bg-black/94 p-2 shadow-[0_0_35px_rgba(255,255,255,.16)] backdrop-blur-xl sm:justify-between" aria-label="Backend menu">
            {adminViews.map((view) => <button key={view.id} type="button" onClick={() => setAdminView(view.id)} className={`grid min-w-[4.85rem] shrink-0 place-items-center rounded-[1.05rem] px-2.5 py-2 text-[0.64rem] font-black uppercase leading-tight tracking-[0.045em] transition sm:min-w-0 sm:flex-1 ${adminView === view.id ? "bg-white text-black shadow-[0_0_22px_rgba(255,255,255,.28)]" : "text-white hover:bg-white/10"}`}><span className="text-lg leading-none">{view.icon}</span><span className="mt-1 whitespace-nowrap">{view.label}</span></button>)}
          </nav>
        </div></div></section>}
      </div>
      {!isBackend && (
        <footer className="snap-section px-5 pb-12 pt-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/25 bg-black/55 px-5 py-6 text-center sm:px-7">
            <p className="eyebrow">Kontakt os i dag</p>
            <h2 className="mt-3 text-4xl font-semibold uppercase tracking-[0.16em] text-white sm:text-5xl">Ølands Service</h2>
            <p className="mt-4 text-base leading-7 text-stone-200/82">Transport, flytning og praktisk logistik med enkel booking, tydelige priser og personlig service.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <a href="tel:+4526848789" className="contact-card justify-center"><Icon name="phone" className="h-5 w-5 text-white" /><span>26848789</span></a>
              <a href="mailto:kontakt@olandservice.dk" className="contact-card justify-center"><Icon name="mail" className="h-5 w-5 text-white" /><span>kontakt@olandservice.dk</span></a>
              <div className="contact-card justify-center"><span className="grid h-5 w-5 place-items-center text-lg text-white">◷</span><span>Åben 8-20 hver dag</span></div>
            </div>
          </div>
        </footer>
      )}
    </main>
  );
}



function EmployeeHourPage({ employee, entries, onAddEntry, dataLoaded, syncStatus }: { employee?: Employee; entries: TimeEntry[]; onAddEntry: (employee: Employee, entry: Omit<TimeEntry, "id" | "employeeId" | "employeeName" | "createdAt" | "kind">) => void; dataLoaded: boolean; syncStatus: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [taskName, setTaskName] = useState("");
  const [note, setNote] = useState("");
  const [openTaskId, setOpenTaskId] = useState("");
  const calculatedHours = hoursBetween(startTime, endTime);
  const sortedEntries = [...entries].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee || !date || !startTime || !endTime || !taskName.trim()) return;
    onAddEntry(employee, { date, startTime, endTime, taskName: taskName.trim(), note: note.trim(), hours: calculatedHours });
    setStartTime("");
    setEndTime("");
    setTaskName("");
    setNote("");
  }

  if (!dataLoaded) {
    return <main className="employee-page min-h-screen bg-black px-4 py-5 text-stone-50"><section className="panel mx-auto max-w-xl p-5"><h1 className="panel-title">Indlæser timer...</h1><p className="mt-3 text-stone-300/75">{syncStatus}</p></section></main>;
  }

  if (!employee) {
    return <main className="employee-page min-h-screen bg-black px-4 py-5 text-stone-50"><section className="panel mx-auto max-w-xl p-5"><p className="eyebrow">Ølands Service</p><h1 className="mt-3 text-3xl font-black uppercase tracking-[0.16em] text-white">Link ikke aktivt</h1><p className="mt-4 text-stone-300/75">Dette medarbejderlink findes ikke eller er deaktiveret. Kontakt admin for et nyt link.</p></section></main>;
  }

  return <main className="min-h-screen bg-black px-4 pb-10 pt-5 text-stone-50">
    <section className="mx-auto grid max-w-3xl gap-4">
      <div className="panel p-5">
        <p className="eyebrow">Ølands Service</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-white">Timekontrol</h1>
        <p className="mt-2 text-stone-300/75">Medarbejder: <span className="font-bold text-white">{employee.name}</span></p>
        <p className="mt-1 text-xs text-stone-400">{syncStatus}</p>
      </div>

      <section className="panel p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Total timer</p>
        <p className="mt-2 text-3xl font-black text-white">{formatHours(totalHours)}</p>
      </section>

      <form onSubmit={submit} className="panel grid gap-3 p-5">
        <h2 className="panel-title">Gem timer</h2>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Dato"><TextInput className="form-input time-control-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></Field>
          <Field label="Start"><TextInput className="form-input time-control-input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></Field>
          <Field label="Slut"><TextInput className="form-input time-control-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required /></Field>
        </div>
        <Field label="Opgave"><TextInput value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Fx levering, flytning, lager" required /></Field>
        <Field label="Note"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kort note" rows={2} className="form-input resize-none" /></Field>
        <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white">Beregnet tid</p>
          <p className="text-xl font-black">{formatHours(calculatedHours)}</p>
        </div>
        <button type="submit" className="gold-button w-full">Gem timer</button>
      </form>

      <section className="panel p-5">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="panel-title">Alle opgaver</h2></div>
          <p className="text-sm font-black text-white">{formatHours(totalHours)}</p>
        </div>
        <div className="mt-4 grid gap-3">
          {sortedEntries.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300/75">Ingen timer registreret endnu.</p>}
          {sortedEntries.map((entry) => <button key={entry.id} type="button" onClick={() => setOpenTaskId(openTaskId === entry.id ? "" : entry.id)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/35">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-black text-white">{entry.taskName}</p><p className="text-sm text-stone-300/75">{entry.date} {entry.startTime && entry.endTime ? `· ${entry.startTime}-${entry.endTime}` : ""}</p></div>
              <p className={`shrink-0 text-lg font-black ${entry.hours < 0 ? "text-red-200" : "text-white"}`}>{formatHours(entry.hours)}</p>
            </div>
            {openTaskId === entry.id && <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-stone-300/80">
              <p><span className="text-stone-500">Start:</span> {entry.startTime || "—"}</p>
              <p><span className="text-stone-500">Slut:</span> {entry.endTime || "—"}</p>
              <p><span className="text-stone-500">Note:</span> {entry.note || "—"}</p>
              <p><span className="text-stone-500">Registreret:</span> {new Date(entry.createdAt).toLocaleString("da-DK")}</p>
            </div>}
          </button>)}
        </div>
      </section>
    </section>
  </main>;
}


function EmployeesModule({ employees, timeEntries, newEmployeeName, onNameChange, onCreate, onUpdateEmployee, onCopyLink, onRemoveHours }: { employees: Employee[]; timeEntries: TimeEntry[]; newEmployeeName: string; onNameChange: (value: string) => void; onCreate: (event?: React.FormEvent<HTMLFormElement>) => void; onUpdateEmployee: (id: string, patch: Partial<Employee>) => void; onCopyLink: (employee: Employee) => void; onRemoveHours: (employee: Employee, hours: number, note: string) => void }) {
  const [adjustEmployeeId, setAdjustEmployeeId] = useState("");
  const [adjustHours, setAdjustHours] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [openTaskId, setOpenTaskId] = useState("");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [employeeDashboardOpen, setEmployeeDashboardOpen] = useState(false);

  const sortedEntries = [...timeEntries].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  const selectedAdjustEmployee = employees.find((employee) => employee.id === adjustEmployeeId);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const allTaskListOpen = showAllTasks && !selectedEmployee;
  const visibleEntries = selectedEmployee ? sortedEntries.filter((entry) => entry.employeeId === selectedEmployee.id) : allTaskListOpen ? sortedEntries : [];
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

  function totalFor(employee: Employee) {
    return timeEntries.filter((entry) => entry.employeeId === employee.id).reduce((sum, entry) => sum + entry.hours, 0);
  }

  function removeHours(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdjustEmployee) return;
    onRemoveHours(selectedAdjustEmployee, Number(adjustHours), adjustNote.trim());
    setAdjustHours("");
    setAdjustNote("");
  }

  function openAllTasks() {
    setSelectedEmployeeId("");
    setShowAllTasks((open) => !open);
    setOpenTaskId("");
  }

  function openEmployee(employeeId: string) {
    setSelectedEmployeeId(selectedEmployeeId === employeeId ? "" : employeeId);
    setShowAllTasks(false);
    setOpenTaskId("");
  }

  return <div className="mt-4 grid gap-4">
    <section className="grid gap-2">
      <button type="button" onClick={openAllTasks} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${allTaskListOpen ? "border-white bg-white/10" : "border-white/10 bg-white/[0.04] hover:border-white/35"}`}>
        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Total timer</p>
        <p className="mt-1 text-3xl font-black text-white">{formatHours(totalHours)}</p>
      </button>
      <div className="grid gap-2">
        {employees.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300/75">Ingen medarbejdere oprettet endnu.</p>}
        {employees.map((employee) => {
          const active = selectedEmployeeId === employee.id;
          return <button key={employee.id} type="button" onClick={() => openEmployee(employee.id)} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? "border-white bg-white/10" : "border-white/10 bg-white/[0.04] hover:border-white/35"}`}>
            <span className="min-w-0 truncate font-black text-white">{employee.name}</span>
            <span className="shrink-0 font-black text-white">{formatHours(totalFor(employee))}</span>
          </button>;
        })}
      </div>
    </section>

    {(allTaskListOpen || selectedEmployee) && <section className="panel p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="panel-title">{selectedEmployee ? `${selectedEmployee.name} · opgaver` : "Alle opgaver"}</h3>
        <button type="button" className="outline-button" onClick={() => { setSelectedEmployeeId(""); setShowAllTasks(false); setOpenTaskId(""); }}>Luk liste</button>
      </div>
      <div className="mt-4 grid gap-3">
        {visibleEntries.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300/75">Ingen opgaver registreret endnu.</p>}
        {visibleEntries.map((entry) => <button key={entry.id} type="button" onClick={() => setOpenTaskId(openTaskId === entry.id ? "" : entry.id)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/35">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-black text-white">{entry.employeeName}</p>
              <p className="text-sm text-stone-300/75">{entry.taskName}</p>
            </div>
            <p className={entry.hours < 0 ? "text-lg font-black text-red-200" : "text-lg font-black text-white"}>{formatHours(entry.hours)}</p>
          </div>
          {openTaskId === entry.id && <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-stone-300/80 lg:grid-cols-2">
            <p><span className="text-stone-500">Dato:</span> {entry.date}</p>
            <p><span className="text-stone-500">Medarbejder:</span> {entry.employeeName}</p>
            <p><span className="text-stone-500">Start:</span> {entry.startTime || "—"}</p>
            <p><span className="text-stone-500">Slut:</span> {entry.endTime || "—"}</p>
            <p><span className="text-stone-500">Timer:</span> {formatHours(entry.hours)}</p>
            <p><span className="text-stone-500">Opgave:</span> {entry.taskName}</p>
            <p className="lg:col-span-2"><span className="text-stone-500">Note:</span> {entry.note || "—"}</p>
            <p className="lg:col-span-2"><span className="text-stone-500">Registreret:</span> {new Date(entry.createdAt).toLocaleString("da-DK")}</p>
          </div>}
        </button>)}
      </div>
    </section>}

    <section className="grid gap-4">
      <button type="button" onClick={() => setEmployeeDashboardOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-left">
        <span className="min-w-0 truncate text-sm font-black uppercase tracking-[0.14em] text-white sm:text-base">Medarbejderdashboard</span>
        <span className="text-2xl text-white">{employeeDashboardOpen ? "−" : "+"}</span>
      </button>
      {employeeDashboardOpen && <div className="grid gap-4">
        <div className="grid gap-3">
          <div>
            <p className="eyebrow">Medarbejdere</p>
            <h3 className="panel-title mt-2">Opret medarbejderlinks</h3>
          </div>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <TextInput value={newEmployeeName} onChange={(event) => onNameChange(event.target.value)} placeholder="Medarbejdernavn" />
            <button type="submit" className="gold-button w-full sm:w-auto">Opret</button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {employees.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300/75">Ingen medarbejdere oprettet endnu.</p>}
          {employees.map((employee) => <div key={employee.id} className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="grid min-w-0 gap-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h4 className="min-w-0 truncate text-xl font-black text-white">{employee.name}</h4>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.1em] ${employee.active ? "border-white/30 text-white" : "border-red-300/35 text-red-200"}`}>{employee.active ? "Aktiv" : "Off"}</span>
              </div>
              <p className="text-sm text-stone-300/75">{formatHours(totalFor(employee))}</p>
            </div>
            <div className="mt-3 grid w-full grid-cols-2 gap-2">
              <button type="button" className="gold-button w-full !min-h-[2.35rem] !px-1.5 !text-[0.56rem] !tracking-[0.08em]" onClick={() => onCopyLink(employee)}>Kopiér link</button>
              <button type="button" className="outline-button w-full !min-h-[2.35rem] !px-1.5 !text-[0.56rem] !tracking-[0.08em]" onClick={() => onUpdateEmployee(employee.id, { active: !employee.active })}>{employee.active ? "Deaktiver" : "Aktiver"}</button>
            </div>
          </div>)}
        </div>
      </div>}
    </section>

    <section className="panel p-4">
      <h3 className="panel-title">Fjern timer fra total</h3>
      <form onSubmit={removeHours} className="mt-5 grid gap-4 lg:grid-cols-[1fr_10rem_1fr_auto] lg:items-end">
        <Field label="Medarbejder"><Select value={adjustEmployeeId} onChange={(event) => setAdjustEmployeeId(event.target.value)} required><option value="">Vælg medarbejder</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select></Field>
        <Field label="Timer"><TextInput type="number" min="0" step="0.25" value={adjustHours} onChange={(event) => setAdjustHours(event.target.value)} placeholder="2.5" required /></Field>
        <Field label="Note"><TextInput value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} placeholder="Hvorfor fjernes timer?" /></Field>
        <button type="submit" className="gold-button">Fjern</button>
      </form>
    </section>
  </div>;
}
function CarEditor({ car, preferredDate = "", preferredTime = "", onDateChange, onTimeChange, onPatch, onToggle }: { car: CarEntry; preferredDate?: string; preferredTime?: string; onDateChange?: (value: string) => void; onTimeChange?: (value: string) => void; onPatch: (patch: Partial<CarEntry>) => void; onToggle: (key: "services" | "extras", itemId: string) => void }) {
  const showDateTime = Boolean(onDateChange && onTimeChange);
  return <>
    <div className={showDateTime ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid gap-3"}>
      <Field label="Opgavetype">
        <Select value={car.type} onChange={(e) => onPatch({ type: e.target.value })}>
          <option>Flytning</option>
          <option>Transport</option>
          <option>Opbevaring</option>
        </Select>
      </Field>
      {showDateTime && <Field label="Dato & tid">
        <div className="booking-date-time-grid">
          <TextInput required type="date" className="booking-date-time-input" value={preferredDate} onChange={(e) => onDateChange?.(e.target.value)} />
          <TextInput required type="time" className="booking-date-time-input" value={preferredTime} onChange={(e) => onTimeChange?.(e.target.value)} />
        </div>
      </Field>}
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {packages.map((pack) => <button key={pack.id} type="button" onClick={() => onPatch({ packageId: pack.id })} className={car.packageId === pack.id ? "choice-card is-selected items-start" : "choice-card items-start"}>
        <span><Icon name={pack.icon} className="h-8 w-8 text-white" /></span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <strong>{pack.title}</strong>
            <em>{kr(pack.price)}</em>
          </span>
          <span className="mt-2 grid gap-1 text-left text-[0.7rem] font-medium normal-case leading-4 tracking-normal text-stone-200/70">
            {pack.items.map((item) => <span key={item} className="flex gap-1.5"><b className="font-black text-white">•</b><span>{item}</span></span>)}
          </span>
        </span>
      </button>)}
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div>
        <h4 className="mini-title">Ekstra ydelser</h4>
        <div className="mt-2 grid gap-2">{services.map((service) => <label key={service.id} className="check-row"><input type="checkbox" checked={car.services.includes(service.id)} onChange={() => onToggle("services", service.id)} /><span>{service.name}</span><strong>{kr(service.price)}</strong></label>)}</div>
      </div>
      <div>
        <h4 className="mini-title">Tillæg</h4>
        <div className="mt-2 grid gap-2">{extras.map((extra) => <label key={extra.id} className="check-row"><input type="checkbox" checked={car.extras.includes(extra.id)} onChange={() => onToggle("extras", extra.id)} /><span>{extra.name}</span><strong>{extra.note ?? kr(extra.price)}</strong></label>)}</div>
      </div>
    </div>

    <div className="mt-4 grid gap-3">
      <Field label="Beskriv opgaven"><TextArea value={car.notes} onChange={(e) => onPatch({ notes: e.target.value })} placeholder="Beskriv opgaven, afhentning, levering, adgang eller særlige forhold." /></Field>
      <Field label="Upload billeder"><input type="file" multiple accept="image/*" className="form-input min-w-0 pt-3" onChange={(e) => onPatch({ uploads: Array.from(e.target.files ?? []).map((file) => file.name) })} /></Field>
      {car.uploads.length > 0 && <p className="text-sm leading-5 text-stone-300/70">{fileNameSummary(car.uploads)}</p>}
    </div>
  </>;
}
function OrderList({ orders, selectedId, onSelect }: { orders: Order[]; selectedId?: string; onSelect: (id: string) => void }) {
  return <div className="grid content-start gap-3">{orders.length === 0 && <div className="panel p-6 text-center text-stone-300/70">Ingen ordrer matcher filteret.</div>}{orders.map((order) => <button key={order.id} type="button" onClick={() => onSelect(order.id)} className={selectedId === order.id ? "order-card is-active" : "order-card"}><div className="flex items-start justify-between gap-3"><span><strong>{order.customer.name || "Ukendt kunde"}</strong><em>{order.id} · {new Date(order.createdAt).toLocaleDateString("da-DK")}</em></span><b>{order.status}</b></div><div className="mt-3 grid grid-cols-3 gap-2 text-left text-xs uppercase tracking-[0.12em] text-stone-300/70"><span>{order.cars.length} opgave(r)</span><span>{order.adminDate || order.preferredDate}</span><span className="text-right text-white">{kr(orderTotal(order))}</span></div></button>)}</div>;
}

function InvoiceModule({ orders, invoices, selectedInvoiceId, onSelectInvoice, onCreateFromOrder, onUpdateInvoice, onSendInvoice, onMarkPaid, onDeleteInvoice }: { orders: Order[]; invoices: InvoiceRecord[]; selectedInvoiceId: string; onSelectInvoice: (id: string) => void; onCreateFromOrder: (order: Order) => void; onUpdateInvoice: (id: string, patch: Partial<InvoiceRecord>) => void; onSendInvoice: (id: string) => void; onMarkPaid: (id: string) => void; onDeleteInvoice: (id: string) => void }) {
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0];
  const ordersWithoutInvoice = orders.filter((order) => !invoices.some((invoice) => invoice.orderId === order.id) && order.status !== "Annulleret");
  const totals = {
    draft: invoices.filter((invoice) => invoice.status === "Kladde").length,
    sent: invoices.filter((invoice) => invoice.status === "Sendt").length,
    paid: invoices.filter((invoice) => invoice.status === "Betalt").length,
    unpaidValue: invoices.filter((invoice) => invoice.status !== "Betalt" && invoice.status !== "Annulleret").reduce((sum, invoice) => sum + invoiceTotal(invoice), 0)
  };

  function updateLine(lineId: string, patch: Partial<InvoiceLine>) {
    if (!selectedInvoice) return;
    onUpdateInvoice(selectedInvoice.id, { lines: selectedInvoice.lines.map((line) => line.id === lineId ? { ...line, ...patch } : line) });
  }

  function addLine() {
    if (!selectedInvoice) return;
    onUpdateInvoice(selectedInvoice.id, { lines: [...selectedInvoice.lines, { id: cryptoId(), text: "Ny fakturalinje", qty: 1, price: 0 }] });
  }

  function removeLine(lineId: string) {
    if (!selectedInvoice || selectedInvoice.lines.length <= 1) return;
    onUpdateInvoice(selectedInvoice.id, { lines: selectedInvoice.lines.filter((line) => line.id !== lineId) });
  }

  return <div className="backend-module mt-4 grid gap-6">
    <div className="grid gap-4 sm:grid-cols-4">{[{ label: "Kladder", value: totals.draft }, { label: "Sendt", value: totals.sent }, { label: "Betalt", value: totals.paid }, { label: "Åbent beløb", value: kr(totals.unpaidValue) }].map((item) => <div key={item.label} className="panel p-4"><p className="text-xs uppercase tracking-[0.22em] text-stone-400">{item.label}</p><p className="mt-2 text-2xl font-black text-white">{item.value}</p></div>)}</div>
    <section className="panel p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="panel-title mb-0">Opret faktura fra ordre</h3><p className="mt-3 text-sm text-stone-300/75">Vælg en ordre og opret en fakturakladde med bilerne som fakturalinjer.</p></div></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{ordersWithoutInvoice.length === 0 && <p className="text-sm text-stone-300/70">Alle aktive ordrer har allerede en faktura.</p>}{ordersWithoutInvoice.map((order) => <div key={order.id} className="detail-box flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h4>{order.id} · {order.customer.name || "Ukendt kunde"}</h4><p>{order.cars.length} opgave(r) · {order.adminDate || order.preferredDate || "Ikke planlagt"} · {kr(orderTotal(order))}</p></div><button type="button" className="gold-button" onClick={() => onCreateFromOrder(order)}>Opret faktura</button></div>)}</div></section>
    <div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
      <div className="grid content-start gap-3">{invoices.length === 0 && <div className="panel p-6 text-center text-stone-300/70">Ingen fakturaer endnu.</div>}{invoices.map((invoice) => <button key={invoice.id} type="button" onClick={() => onSelectInvoice(invoice.id)} className={selectedInvoice?.id === invoice.id ? "order-card is-active" : "order-card"}><div className="flex items-start justify-between gap-3"><span><strong>{invoice.invoiceNo}</strong><em>{invoice.customerName || "Ukendt kunde"} · {invoice.orderId}</em></span><b>{invoice.status}</b></div><div className="mt-3 grid grid-cols-3 gap-2 text-left text-xs uppercase tracking-[0.12em] text-stone-300/70"><span>{invoice.dueDate}</span><span>{invoice.email || "ingen email"}</span><span className="text-right text-white">{kr(invoiceTotal(invoice))}</span></div></button>)}</div>
      {!selectedInvoice ? <div className="panel grid min-h-[28rem] place-items-center p-6 text-center text-stone-300/70">Vælg eller opret en faktura.</div> : <section className="panel p-4 sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">{selectedInvoice.orderId}</p><h3 className="mt-2 admin-section-heading">{selectedInvoice.invoiceNo}</h3><p className="mt-2 text-stone-300/75">{selectedInvoice.customerName || "Ukendt kunde"} · {selectedInvoice.email || "ingen email"}</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-[0.18em] text-stone-400">Total</p><p className="text-3xl font-black text-white">{kr(invoiceTotal(selectedInvoice))}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Field label="Fakturanr."><TextInput value={selectedInvoice.invoiceNo} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { invoiceNo: e.target.value })} /></Field><Field label="Status"><Select value={selectedInvoice.status} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { status: e.target.value as InvoiceStatus })}><option>Kladde</option><option>Sendt</option><option>Betalt</option><option>Forfalden</option><option>Annulleret</option></Select></Field><Field label="Forfald"><TextInput type="date" value={selectedInvoice.dueDate} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { dueDate: e.target.value })} /></Field><Field label="Kunde"><TextInput value={selectedInvoice.customerName} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { customerName: e.target.value })} /></Field><Field label="Email"><TextInput value={selectedInvoice.email} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { email: e.target.value })} /></Field><Field label="CVR"><TextInput value={selectedInvoice.cvr} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { cvr: e.target.value })} /></Field><Field label="Firma"><TextInput value={selectedInvoice.company} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { company: e.target.value })} /></Field><Field label="Fakturaadresse"><TextInput value={selectedInvoice.invoiceAddress} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { invoiceAddress: e.target.value })} /></Field></div><div className="mt-6 detail-box"><div className="mb-4 flex items-center justify-between gap-3"><h4>Fakturalinjer</h4><button type="button" className="outline-button" onClick={addLine}>+ Linje</button></div><div className="grid gap-3">{selectedInvoice.lines.map((line) => <div key={line.id} className="grid gap-3 rounded-2xl border border-white/15 bg-black/25 p-3 sm:grid-cols-[1fr_5rem_7rem_6rem_auto]"><TextInput value={line.text} onChange={(e) => updateLine(line.id, { text: e.target.value })} /><TextInput type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) || 1 })} /><TextInput type="number" min="0" value={line.price} onChange={(e) => updateLine(line.id, { price: Number(e.target.value) || 0 })} /><div className="grid place-items-center text-sm font-black text-white">{kr(line.qty * line.price)}</div><button type="button" className="small-danger" onClick={() => removeLine(line.id)}>Fjern</button></div>)}</div></div><div className="mt-6"><Field label="Fakturanote"><TextArea value={selectedInvoice.note} onChange={(e) => onUpdateInvoice(selectedInvoice.id, { note: e.target.value })} /></Field></div><div className="mt-6 grid gap-3 sm:grid-cols-4"><button type="button" className="gold-button" onClick={() => onSendInvoice(selectedInvoice.id)}>Send faktura</button><button type="button" className="outline-button" onClick={() => onMarkPaid(selectedInvoice.id)}>Marker betalt</button><a className="outline-button" href={`mailto:${selectedInvoice.email}`}>Email kunde</a><button type="button" className="small-danger" onClick={() => onDeleteInvoice(selectedInvoice.id)}>Slet faktura</button></div><div className="mt-4 detail-box"><h4>Statuskontrol</h4><p>Oprettet: {new Date(selectedInvoice.createdAt).toLocaleString("da-DK")}</p><p>Sendt: {selectedInvoice.sentAt ? new Date(selectedInvoice.sentAt).toLocaleString("da-DK") : "ikke sendt"}</p><p>Betalt: {selectedInvoice.paidAt ? new Date(selectedInvoice.paidAt).toLocaleString("da-DK") : "ikke betalt"}</p><p>Mail-knappen åbner kundens mailprogram med fakturateksten. Et rigtigt send-/betalingsflow kan kobles på senere med database, email-provider og regnskabssystem.</p></div></section>}
    </div>
  </div>;
}

type OrderEditHandlers = {
  onUpdate: (id: string, patch: Partial<Order>, activity?: string) => void;
  onUpdateCustomer: (id: string, patch: Partial<CustomerInfo>) => void;
  onUpdateInvoice: (id: string, patch: Partial<InvoiceInfo>) => void;
  onUpdateCar: (orderId: string, carId: string, patch: Partial<CarEntry>) => void;
  onToggleCarArray: (orderId: string, carId: string, key: "services" | "extras", itemId: string) => void;
  onAddCar: (id: string) => void;
  onRemoveCar: (orderId: string, carId: string) => void;
  onDelete: (id: string) => void;
};

function NewOrdersModule({ orders, onAccept, ...handlers }: { orders: Order[]; onAccept: (id: string) => void } & OrderEditHandlers) {
  return <section className="backend-module mt-4 grid gap-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">New orders</p><h3 className="admin-section-heading">Nye forespørgsler</h3></div><span className="rounded-full border border-white/30 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-white">{orders.length} nye</span></div>
    {orders.length === 0 && <div className="panel p-6 text-center text-stone-300/70">Ingen nye ordrer lige nu.</div>}
    {orders.map((order) => <details key={order.id} className="panel overflow-hidden p-0" open={orders.length === 1}>
      <summary className="cursor-pointer list-none p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="eyebrow">{order.id}</p><h4 className="mt-1 text-2xl font-black uppercase tracking-[0.12em] text-white">{order.customer.name || "Ny kunde"}</h4><p className="mt-1 text-stone-300/75">{order.customer.phone || "telefon mangler"} · {order.preferredDate || "dato mangler"} {order.preferredTime || ""}</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-[0.18em] text-stone-400">Total</p><p className="text-2xl font-black text-white">{kr(orderTotal(order))}</p></div></div></summary>
      <div className="border-t border-white/15 p-5"><div className="mb-5 grid gap-3 sm:grid-cols-3"><button className="gold-button" type="button" onClick={() => onAccept(order.id)}>Accepter + send mail</button><a className="outline-button" href={`mailto:${order.customer.email}`}>Email kunde</a><a className="outline-button" href={`tel:${order.customer.phone}`}>Ring kunde</a></div><OrderDetail selectedOrder={order} {...handlers} /></div>
    </details>)}
  </section>;
}

function CalendarModule({ calendarDays, onUpdate, onSelect }: { calendarDays: [string, Order[]][]; onUpdate: (id: string, patch: Partial<Order>, activity?: string) => void; onSelect: (id: string) => void }) {
  return <section className="backend-module mt-4 grid gap-4"><div><p className="eyebrow">Calendar</p><h3 className="admin-section-heading">Bekræftede ordrer</h3></div>{calendarDays.length === 0 && <div className="panel p-6 text-center text-stone-300/70">Ingen accepterede ordrer i kalenderen endnu.</div>}{calendarDays.map(([date, dayOrders]) => <section key={date} className="panel p-5"><div className="mb-4 flex items-center justify-between"><h4 className="text-xl font-black uppercase tracking-[0.18em] text-white">{date === "Ikke planlagt" ? date : new Date(`${date}T00:00`).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}</h4><span className="rounded-full border border-white/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white">{dayOrders.length} ordre</span></div><div className="grid gap-3">{dayOrders.sort((a, b) => `${a.adminTime || a.preferredTime}`.localeCompare(`${b.adminTime || b.preferredTime}`)).map((order) => <details key={order.id} className="rounded-2xl border border-white/15 bg-black/30"><summary className="cursor-pointer list-none p-4"><div className="grid gap-2 sm:grid-cols-[5rem_1fr_auto_auto]"><span className="font-black text-white">{order.adminTime || order.preferredTime || "--:--"}</span><strong>{order.customer.name || "Ukendt kunde"}</strong><em className="text-stone-300/70">{order.cars.length} opgave(r) · {order.status}</em><b className="text-white">{kr(orderTotal(order))}</b></div></summary><div className="border-t border-white/10 p-4"><div className="grid gap-3 sm:grid-cols-3"><Field label="Ordrestatus"><Select value={order.status} onChange={(e) => onUpdate(order.id, { status: e.target.value as OrderStatus }, `Status ændret til ${e.target.value}`)}>{statuses.map((status) => <option key={status}>{status}</option>)}</Select></Field><Field label="Dato"><TextInput type="date" value={order.adminDate || order.preferredDate} onChange={(e) => onUpdate(order.id, { adminDate: e.target.value }, "Dato opdateret")} /></Field><Field label="Tid"><TextInput type="time" value={order.adminTime || order.preferredTime} onChange={(e) => onUpdate(order.id, { adminTime: e.target.value }, "Tid opdateret")} /></Field></div><button type="button" className="outline-button mt-4" onClick={() => onSelect(order.id)}>Åbn i ordrevisning</button></div></details>)}</div></section>)}</section>;
}

function CompletedOrdersModule({ orders, ...handlers }: { orders: Order[] } & OrderEditHandlers) {
  const invoiceSent = orders.filter((order) => ["Udført", "Faktura sendt", "Færdig", "Faktureret"].includes(order.status));
  const paid = orders.filter((order) => order.status === "Betaling modtaget" || order.paymentStatus === "Betalt");
  const renderGroup = (title: string, list: Order[]) => <section className="grid gap-3"><h4 className="panel-title">{title}</h4>{list.length === 0 && <div className="panel p-5 text-stone-300/70">Ingen ordrer i denne gruppe.</div>}{list.map((order) => <details key={order.id} className="panel p-0"><summary className="cursor-pointer list-none p-5"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="eyebrow">{order.id}</p><h5 className="text-2xl font-black uppercase tracking-[0.12em] text-white">{order.customer.name || "Kunde"}</h5><p className="text-stone-300/70">{order.status} · {order.paymentStatus}</p></div><b className="text-2xl text-white">{kr(orderTotal(order))}</b></div></summary><div className="border-t border-white/15 p-5"><OrderDetail selectedOrder={order} {...handlers} /></div></details>)}</section>;
  return <section className="backend-module mt-4 grid gap-8"><div><p className="eyebrow">Completed orders</p><h3 className="admin-section-heading">Færdige ordrer</h3></div>{renderGroup("Faktura sendt / afventer betaling", invoiceSent)}{renderGroup("Betaling modtaget", paid)}</section>;
}

function ServicesModule({ drafts, onUpdate, onAdd, onPublish }: { drafts: { services: Service[]; extras: Extra[]; packages: CarePackage[] }; onUpdate: (kind: "services" | "extras" | "packages", id: string, patch: Partial<Service & Extra & CarePackage>) => void; onAdd: (kind: "services" | "extras" | "packages") => void; onPublish: () => void }) {
  return <section className="backend-module mt-4 grid gap-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Services</p><h3 className="admin-section-heading">Ydelser, pakker og tillæg</h3><p className="mt-2 text-stone-300/75">Ændringer gemmes som kladder. Tryk publicer for at gøre dem aktive på kundesiden.</p></div><button className="gold-button" type="button" onClick={onPublish}>Publicer alle kladder</button></div>
    <ServiceGroup title="Pakker" kind="packages" items={drafts.packages} onUpdate={onUpdate} onAdd={onAdd} />
    <ServiceGroup title="Enkeltydelser" kind="services" items={drafts.services} onUpdate={onUpdate} onAdd={onAdd} />
    <ServiceGroup title="Tillæg" kind="extras" items={drafts.extras} onUpdate={onUpdate} onAdd={onAdd} />
  </section>;
}

function ServiceGroup({ title, kind, items, onUpdate, onAdd }: { title: string; kind: "services" | "extras" | "packages"; items: Array<Service | Extra | CarePackage>; onUpdate: (kind: "services" | "extras" | "packages", id: string, patch: Partial<Service & Extra & CarePackage>) => void; onAdd: (kind: "services" | "extras" | "packages") => void }) {
  return <section className="panel p-5"><div className="mb-4 flex items-center justify-between gap-3"><h4 className="panel-title mb-0">{title}</h4><button type="button" className="outline-button" onClick={() => onAdd(kind)}>+ Tilføj</button></div><div className="grid gap-3">{items.map((item) => {
    const isPackage = kind === "packages";
    const name = isPackage ? (item as CarePackage).title : (item as Service).name;
    const desc = isPackage ? (item as CarePackage).items.join("\n") : ((item as Service).description ?? "");
    return <details key={item.id} className="rounded-2xl border border-white/15 bg-black/25"><summary className="cursor-pointer list-none p-4"><div className="flex items-center justify-between gap-3"><strong className="text-white">{name}</strong><span className="text-stone-200">{kr(item.price)}</span>{item.draft && <em className="rounded-full bg-white px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black">kladde</em>}</div></summary><div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2"><Field label="Navn"><TextInput value={name} onChange={(e) => onUpdate(kind, item.id, isPackage ? { title: e.target.value } : { name: e.target.value })} /></Field><Field label="Pris"><TextInput type="number" value={item.price} onChange={(e) => onUpdate(kind, item.id, { price: Number(e.target.value) || 0 })} /></Field>{isPackage && <Field label="Ikon"><Select value={(item as CarePackage).icon} onChange={(e) => onUpdate(kind, item.id, { icon: e.target.value as CarePackage["icon"] })}><option value="shield">Shield</option><option value="diamond">Diamond</option><option value="crown">Crown</option><option value="laurel">Laurel</option></Select></Field>}<div className="sm:col-span-2"><Field label={isPackage ? "Indhold - én linje per punkt" : "Beskrivelse"}><TextArea value={desc} onChange={(e) => onUpdate(kind, item.id, isPackage ? { items: e.target.value.split("\n").filter(Boolean), description: e.target.value } : { description: e.target.value })} /></Field></div>{kind === "extras" && <Field label="Prisnote"><TextInput value={(item as Extra).note ?? ""} onChange={(e) => onUpdate(kind, item.id, { note: e.target.value })} placeholder="fx fra 200 kr." /></Field>}</div></details>;
  })}</div></section>;
}

function CompanyInfoModule({ companyInfo, onChange }: { companyInfo: CompanyInfo; onChange: (next: CompanyInfo) => void }) {
  const patch = (part: Partial<CompanyInfo>) => onChange({ ...companyInfo, ...part });
  return <section className="mt-6 grid gap-6 lg:grid-cols-2"><div><p className="eyebrow">Company information</p><h3 className="admin-section-heading">Firmaoplysninger</h3></div><section className="panel p-5 lg:col-span-2"><h4 className="panel-title">Kontakt</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="Firmanavn"><TextInput value={companyInfo.name} onChange={(e) => patch({ name: e.target.value })} /></Field><Field label="Telefon"><TextInput value={companyInfo.phone} onChange={(e) => patch({ phone: e.target.value })} /></Field><Field label="Email"><TextInput value={companyInfo.email} onChange={(e) => patch({ email: e.target.value })} /></Field><Field label="Åbningstid"><TextInput value={companyInfo.openingHours} onChange={(e) => patch({ openingHours: e.target.value })} /></Field><div className="sm:col-span-2"><Field label="Adresse"><TextInput value={companyInfo.address} onChange={(e) => patch({ address: e.target.value })} /></Field></div></div></section><section className="panel p-5 lg:col-span-2"><h4 className="panel-title">Faktura</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="Fakturanavn"><TextInput value={companyInfo.invoiceName} onChange={(e) => patch({ invoiceName: e.target.value })} /></Field><Field label="CVR"><TextInput value={companyInfo.cvr} onChange={(e) => patch({ cvr: e.target.value })} /></Field><Field label="Faktura email"><TextInput value={companyInfo.invoiceEmail} onChange={(e) => patch({ invoiceEmail: e.target.value })} /></Field><Field label="Betalingsfrist"><TextInput value={companyInfo.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value })} /></Field><div className="sm:col-span-2"><Field label="Fakturaadresse"><TextInput value={companyInfo.invoiceAddress} onChange={(e) => patch({ invoiceAddress: e.target.value })} /></Field></div><div className="sm:col-span-2"><Field label="Bank / betaling"><TextArea value={companyInfo.bankInfo} onChange={(e) => patch({ bankInfo: e.target.value })} /></Field></div></div></section></section>;
}

function OrderDetail({ selectedOrder, onUpdate, onUpdateCustomer, onUpdateInvoice, onUpdateCar, onToggleCarArray, onAddCar, onRemoveCar, onDelete }: { selectedOrder?: Order; onUpdate: (id: string, patch: Partial<Order>, activity?: string) => void; onUpdateCustomer: (id: string, patch: Partial<CustomerInfo>) => void; onUpdateInvoice: (id: string, patch: Partial<InvoiceInfo>) => void; onUpdateCar: (orderId: string, carId: string, patch: Partial<CarEntry>) => void; onToggleCarArray: (orderId: string, carId: string, key: "services" | "extras", itemId: string) => void; onAddCar: (id: string) => void; onRemoveCar: (orderId: string, carId: string) => void; onDelete: (id: string) => void }) {
  if (!selectedOrder) return <div className="panel grid min-h-[32rem] place-items-center p-6 text-center text-stone-300/70">Vælg en ordre for at åbne detaljer.</div>;
  return <div className="panel min-h-[32rem] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">{selectedOrder.id}</p><h3 className="mt-2 admin-section-heading">{selectedOrder.customer.name || "Ordre"}</h3><p className="mt-2 text-stone-300/75">{selectedOrder.customer.phone} · {selectedOrder.customer.email || "ingen email"}</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-[0.18em] text-stone-400">Total</p><p className="text-3xl font-black text-white">{kr(orderTotal(selectedOrder))}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Field label="Status"><Select value={selectedOrder.status} onChange={(e) => onUpdate(selectedOrder.id, { status: e.target.value as OrderStatus }, `Status ændret til ${e.target.value}`)}>{statuses.map((status) => <option key={status}>{status}</option>)}</Select></Field><Field label="Betaling"><Select value={selectedOrder.paymentStatus ?? "Ikke faktureret"} onChange={(e) => onUpdate(selectedOrder.id, { paymentStatus: e.target.value as PaymentStatus }, `Betaling ændret til ${e.target.value}`)}>{paymentStatuses.map((status) => <option key={status}>{status}</option>)}</Select></Field><Field label="Prioritet"><Select value={selectedOrder.priority ?? "Normal"} onChange={(e) => onUpdate(selectedOrder.id, { priority: e.target.value as Priority }, `Prioritet ændret til ${e.target.value}`)}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</Select></Field><Field label="Dato"><TextInput type="date" value={selectedOrder.adminDate} onChange={(e) => onUpdate(selectedOrder.id, { adminDate: e.target.value }, "Dato opdateret")} /></Field><Field label="Tid"><TextInput type="time" value={selectedOrder.adminTime} onChange={(e) => onUpdate(selectedOrder.id, { adminTime: e.target.value }, "Tid opdateret")} /></Field><Field label="Ansvarlig"><TextInput value={selectedOrder.assignedTo ?? ""} onChange={(e) => onUpdate(selectedOrder.id, { assignedTo: e.target.value }, "Ansvarlig opdateret")} placeholder="Mike / team" /></Field></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="detail-box"><h4>Kunde</h4><div className="grid gap-3"><TextInput value={selectedOrder.customer.name} onChange={(e) => onUpdateCustomer(selectedOrder.id, { name: e.target.value })} placeholder="Navn" /><TextInput value={selectedOrder.customer.phone} onChange={(e) => onUpdateCustomer(selectedOrder.id, { phone: e.target.value })} placeholder="Telefon" /><TextInput value={selectedOrder.customer.email} onChange={(e) => onUpdateCustomer(selectedOrder.id, { email: e.target.value })} placeholder="Email" /><TextInput value={selectedOrder.customer.address} onChange={(e) => onUpdateCustomer(selectedOrder.id, { address: e.target.value })} placeholder="Adresse" /></div></div><div className="detail-box"><h4>Faktura</h4><div className="grid gap-3"><Select value={selectedOrder.invoice.invoiceType} onChange={(e) => onUpdateInvoice(selectedOrder.id, { invoiceType: e.target.value })}><option>Privat</option><option>Firma</option></Select><TextInput value={selectedOrder.invoice.company} onChange={(e) => onUpdateInvoice(selectedOrder.id, { company: e.target.value })} placeholder="Firma" /><TextInput value={selectedOrder.invoice.cvr} onChange={(e) => onUpdateInvoice(selectedOrder.id, { cvr: e.target.value })} placeholder="CVR" /><TextInput value={selectedOrder.invoice.invoiceEmail || selectedOrder.customer.email} onChange={(e) => onUpdateInvoice(selectedOrder.id, { invoiceEmail: e.target.value })} placeholder="Faktura email" /><TextInput value={selectedOrder.invoice.invoiceAddress} onChange={(e) => onUpdateInvoice(selectedOrder.id, { invoiceAddress: e.target.value })} placeholder="Faktura adresse" /></div></div></div><div className="mt-6 grid gap-4">{selectedOrder.cars.map((car, index) => <div key={car.id} className="detail-box"><div className="mb-4 flex items-center justify-between gap-3"><h4>Opgave {index + 1} · {car.type}</h4><div className="flex items-center gap-3"><strong className="text-white">{kr(carTotal(car))}</strong>{selectedOrder.cars.length > 1 && <button type="button" className="small-danger" onClick={() => onRemoveCar(selectedOrder.id, car.id)}>Fjern</button>}</div></div><CarEditor car={car} onPatch={(patch) => onUpdateCar(selectedOrder.id, car.id, patch)} onToggle={(key, itemId) => onToggleCarArray(selectedOrder.id, car.id, key, itemId)} /></div>)}</div><button className="outline-button mt-4 w-full" onClick={() => onAddCar(selectedOrder.id)}>+ Tilføj bil til ordre</button><div className="mt-6"><Field label="Interne noter"><TextArea value={selectedOrder.adminNotes} onChange={(e) => onUpdate(selectedOrder.id, { adminNotes: e.target.value })} placeholder="Aftaler, opfølgning, betaling, særlige forhold." /></Field></div>{selectedOrder.customerMessage && <div className="mt-4 detail-box"><h4>Kundebesked</h4><p>{selectedOrder.customerMessage}</p></div>}<div className="mt-4 detail-box"><h4>Aktivitet</h4><div className="grid gap-2 text-sm text-stone-300/75">{(selectedOrder.activity ?? []).slice(0, 8).map((item, index) => <p key={`${item}-${index}`}>• {item}</p>)}</div></div><div className="mt-6 flex flex-wrap gap-3"><a className="outline-button" href={`tel:${selectedOrder.customer.phone}`}>Ring kunde</a><a className="outline-button" href={`mailto:${selectedOrder.customer.email}`}>Email kunde</a><button className="small-danger" type="button" onClick={() => onDelete(selectedOrder.id)}>Slet ordre</button></div></div>;
}
