import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  CircleAlert,
  CheckCircle2,
  History,
  Info,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Pin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { isLiveSyncDegraded, useWebSockets } from "@/hooks/useWebSockets";
import { trpc } from "@/lib/trpc";
import { getSeatBadge } from "@/lib/seatBadge";
import { getAttendanceQueryScope } from "@/lib/attendanceQueryScope";
import { handleCancellationFailure } from "@/lib/staleCancellationRecovery";
import {
  BOOKING_CONFLICT_MESSAGE,
  handleBookingConflict,
} from "@/lib/mutationErrorHandling";

type ClassRecord = {
  id: number;
  name: string;
  trainer: string;
  availableSeats: number;
  capacity: number;
  scheduledTime: string;
  durationMinutes: number;
  location: string;
  category: string;
  imageUrl: string;
};

type HistoryStatus = "attended" | "canceled" | "upcoming" | "no_show";
type HistoryRow = {
  id: number;
  bookingId?: number;
  date: string;
  time: string;
  name: string;
  trainer: string;
  location: string;
  status: HistoryStatus;
};

type ToastTone = "success" | "warning" | "error" | "info";
type ToastState = { tone: ToastTone; title: string; message: string } | null;

const CONFLICT_MESSAGE = BOOKING_CONFLICT_MESSAGE;

const initialClasses: ClassRecord[] = [
  {
    id: 1,
    name: "Cult Dance Fitness",
    trainer: "Coach Rahul",
    availableSeats: 20,
    capacity: 20,
    scheduledTime: "2026-10-28T07:00:00",
    durationMinutes: 50,
    location: "Koramangala Center",
    category: "DANCE",
    imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 2,
    name: "HRX Workout",
    trainer: "Coach Aisha",
    availableSeats: 3,
    capacity: 18,
    scheduledTime: "2026-10-28T08:15:00",
    durationMinutes: 50,
    location: "Indiranagar Arena",
    category: "HIIT",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 3,
    name: "Power Yoga",
    trainer: "Coach Maya",
    availableSeats: 0,
    capacity: 20,
    scheduledTime: "2026-10-28T09:30:00",
    durationMinutes: 60,
    location: "HSR Layout Studio",
    category: "MIND + BODY",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 4,
    name: "Boxing Fundamentals",
    trainer: "Coach Ishan",
    availableSeats: 1,
    capacity: 16,
    scheduledTime: "2026-10-28T10:45:00",
    durationMinutes: 50,
    location: "Whitefield Fight Lab",
    category: "BOXING",
    imageUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 5,
    name: "HIIT Circuit",
    trainer: "Coach Zoya",
    availableSeats: 12,
    capacity: 20,
    scheduledTime: "2026-10-28T12:00:00",
    durationMinutes: 45,
    location: "Jayanagar Powerhouse",
    category: "CONDITIONING",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501b7?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 6,
    name: "Strength Training",
    trainer: "Coach Dev",
    availableSeats: 6,
    capacity: 14,
    scheduledTime: "2026-10-28T18:00:00",
    durationMinutes: 55,
    location: "Bellandur Strength Club",
    category: "STRENGTH",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=85",
  },
];

const initialHistory: HistoryRow[] = [
  { id: 1, date: "Oct 24, 2026", time: "07:00 AM - 07:50 AM", name: "Cult Dance Fitness", trainer: "Coach Rahul", location: "Koramangala Center", status: "attended" },
  { id: 2, date: "Oct 22, 2026", time: "06:30 AM - 07:20 AM", name: "Strength Training", trainer: "Coach Dev", location: "Bellandur Strength Club", status: "attended" },
  { id: 3, date: "Oct 20, 2026", time: "08:00 AM - 08:50 AM", name: "Boxing Fundamentals", trainer: "Coach Ishan", location: "Whitefield Fight Lab", status: "canceled" },
  { id: 4, date: "Oct 18, 2026", time: "07:30 AM - 08:15 AM", name: "HIIT Circuit", trainer: "Coach Zoya", location: "Jayanagar Powerhouse", status: "attended" },
  { id: 5, date: "Oct 16, 2026", time: "06:45 AM - 07:45 AM", name: "Power Yoga", trainer: "Coach Maya", location: "HSR Layout Studio", status: "attended" },
  { id: 6, date: "Oct 14, 2026", time: "09:00 AM - 09:50 AM", name: "HRX Workout", trainer: "Coach Aisha", location: "Indiranagar Arena", status: "canceled" },
  { id: 7, date: "Oct 12, 2026", time: "07:00 AM - 07:50 AM", name: "Cult Dance Fitness", trainer: "Coach Rahul", location: "Koramangala Center", status: "attended" },
  { id: 8, date: "Oct 10, 2026", time: "06:30 PM - 07:25 PM", name: "Strength Training", trainer: "Coach Dev", location: "Bellandur Strength Club", status: "upcoming" },
  { id: 9, date: "Oct 08, 2026", time: "07:15 AM - 08:00 AM", name: "HIIT Circuit", trainer: "Coach Zoya", location: "Jayanagar Powerhouse", status: "attended" },
  { id: 10, date: "Oct 06, 2026", time: "08:30 AM - 09:30 AM", name: "Power Yoga", trainer: "Coach Maya", location: "HSR Layout Studio", status: "attended" },
];

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const formatTimeRange = (classItem: ClassRecord) => {
  const start = new Date(classItem.scheduledTime);
  const end = new Date(start.getTime() + classItem.durationMinutes * 60_000);
  return `${formatTime(start.toISOString())} - ${formatTime(end.toISOString())}`;
};

const statusLabel: Record<HistoryStatus, string> = {
  attended: "ATTENDED",
  canceled: "CANCELED",
  upcoming: "UPCOMING",
  no_show: "NO SHOW",
};

function CatalogSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, index) => (
        <article className="class-card skeleton-card" key={index} aria-busy="true" aria-label="Loading class information">
          <div className="skeleton-block skeleton-media" />
          <div className="class-card-body skeleton-card-body">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-copy" />
            <div className="skeleton-divider" />
            <div className="skeleton-line skeleton-copy" />
            <div className="skeleton-line skeleton-copy short" />
            <div className="skeleton-button" />
          </div>
        </article>
      ))}
    </>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const attendanceQueryScope = useMemo(() => getAttendanceQueryScope(user?.id), [user?.id]);
  const [view, setView] = useState<"catalog" | "history" | "owner">("catalog");
  const catalogQuery = trpc.classes.list.useQuery();
  const historyQuery = trpc.attendance.history.useQuery(attendanceQueryScope, { enabled: Boolean(attendanceQueryScope) && isAuthenticated && view === "history" });
  const countsQuery = trpc.attendance.counts.useQuery(attendanceQueryScope, { enabled: Boolean(attendanceQueryScope) && isAuthenticated && view === "history" });
  const [classes, setClasses] = useState(initialClasses);
  const [history, setHistory] = useState(initialHistory);
  const [activeFilter, setActiveFilter] = useState<"all" | HistoryStatus>("all");
  const [loadingClassId, setLoadingClassId] = useState<number | null>(null);
  const [cancelingBookingId, setCancelingBookingId] = useState<number | null>(null);
  const [confirmedClass, setConfirmedClass] = useState<ClassRecord | null>(null);
  const [confirmationReference, setConfirmationReference] = useState("#CFB-20261028-4821");
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({ all: 48, attended: 36, canceled: 8, upcoming: 4, no_show: 0 });
  const [catalogTimedOut, setCatalogTimedOut] = useState(false);
  const [ownerSelectedClassId, setOwnerSelectedClassId] = useState(initialClasses[0].id);
  const bookingMutation = trpc.bookings.create.useMutation();
  const cancelMutation = trpc.bookings.cancel.useMutation();
  const ownerQueriesEnabled = user?.role === "Owner" && view === "owner";
  const ownerClassesQuery = trpc.owner.classes.useQuery(undefined, { enabled: ownerQueriesEnabled });
  const ownerAuditSummaryQuery = trpc.owner.auditSummary.useQuery(undefined, { enabled: ownerQueriesEnabled });
  const ownerAuditLogsQuery = trpc.owner.auditLogs.useQuery(undefined, { enabled: ownerQueriesEnabled });
  const ownerRosterInput = useMemo(() => ({ classId: ownerSelectedClassId }), [ownerSelectedClassId]);
  const ownerRosterQuery = trpc.owner.roster.useQuery(ownerRosterInput, { enabled: ownerQueriesEnabled });
  const ownerInventoryMutation = trpc.owner.updateInventory.useMutation();
  const ownerCreateMutation = trpc.owner.createClass.useMutation();
  const trpcUtils = trpc.useUtils();

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((tone: ToastTone, title: string, message: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ tone, title, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, tone === "error" ? 7_500 : 5_500);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const classIds = useMemo(() => classes.map(item => item.id), [classes]);
  const handleSeatUpdate = useCallback((update: { classId: number; availableSeats: number }) => {
    setClasses(current => current.map(item => item.id === update.classId ? { ...item, availableSeats: update.availableSeats } : item));
  }, []);

  useEffect(() => {
    if (!catalogQuery.data) return;
    setClasses(catalogQuery.data.map(item => ({
      id: item.id,
      name: item.name,
      trainer: item.trainer,
      availableSeats: item.availableSeats,
      capacity: item.capacity,
      scheduledTime: item.scheduledTime.toISOString(),
      durationMinutes: item.durationMinutes,
      location: item.location,
      category: item.category.toUpperCase(),
      imageUrl: item.imageUrl ?? initialClasses.find(seed => seed.id === item.id)?.imageUrl ?? initialClasses[0].imageUrl,
    })));
  }, [catalogQuery.data]);

  useEffect(() => {
    setHistory([]);
    setCounts({ all: 0, attended: 0, canceled: 0, upcoming: 0, no_show: 0 });
    setPage(1);
  }, [user?.id]);

  useEffect(() => {
    if (!catalogQuery.isLoading) {
      setCatalogTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setCatalogTimedOut(true), 1_500);
    return () => window.clearTimeout(timeout);
  }, [catalogQuery.isLoading]);

  useEffect(() => {
    if (!historyQuery.data) return;
    setHistory(historyQuery.data.map((item, index) => ({
      id: item.id ?? index,
      bookingId: item.bookingId ?? undefined,
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(item.scheduledTime ?? item.recordedAt)),
      time: formatTime(new Date(item.scheduledTime ?? item.recordedAt).toISOString()),
      name: item.className ?? "CureFit session",
      trainer: item.trainer ?? "CureFit coach",
      location: item.location ?? "CureFit center",
      status: item.status === "attended" ? "attended" : item.status === "canceled" ? "canceled" : item.status === "no_show" ? "no_show" : "upcoming",
    })));
  }, [historyQuery.data]);

  useEffect(() => {
    if (countsQuery.data) setCounts(countsQuery.data);
  }, [countsQuery.data]);

  useEffect(() => {
    const firstOwnerClass = ownerClassesQuery.data?.[0];
    if (firstOwnerClass && !ownerClassesQuery.data?.some(item => item.id === ownerSelectedClassId)) {
      setOwnerSelectedClassId(firstOwnerClass.id);
    }
  }, [ownerClassesQuery.data, ownerSelectedClassId]);

  const { connected, connectedRooms, staleRooms, fallbackActive } = useWebSockets(classIds, handleSeatUpdate);
  const liveSyncDegraded = isLiveSyncDegraded(classIds.length, { connected, connectedRooms, staleRooms });

  useEffect(() => {
    if (!liveSyncDegraded) return;
    const pollTimer = window.setInterval(() => { void catalogQuery.refetch(); }, 5_000);
    return () => window.clearInterval(pollTimer);
  }, [catalogQuery.refetch, liveSyncDegraded]);

  const filteredHistory = activeFilter === "all" ? history : history.filter(item => item.status === activeFilter);
  const paginatedHistory = filteredHistory.slice((page - 1) * 10, page * 10);

  const showConflict = useCallback((message = CONFLICT_MESSAGE) => {
    showToast("warning", "Booking conflict", message);
  }, [showToast]);

  const handleBook = async (classItem: ClassRecord) => {
    if (classItem.availableSeats === 0 || loadingClassId) return;
    if (!isAuthenticated) {
      showToast("info", "Sign in required", "Sign in to reserve a real seat in this class.");
      startLogin();
      return;
    }
    setLoadingClassId(classItem.id);
    try {
      const booking = await bookingMutation.mutateAsync({ classId: classItem.id });
      const availableSeats = booking.availableSeats;
      const bookingReference = booking.bookingReference;
      const serverClass = booking.classDetails;
      const confirmationClass: ClassRecord = serverClass ? {
        ...classItem,
        name: serverClass.name,
        trainer: serverClass.trainer,
        scheduledTime: serverClass.scheduledTime.toISOString(),
        durationMinutes: serverClass.durationMinutes,
        location: serverClass.location,
        capacity: serverClass.capacity,
        category: serverClass.category.toUpperCase(),
        imageUrl: serverClass.imageUrl ?? classItem.imageUrl,
        availableSeats,
      } : { ...classItem, availableSeats };
      setClasses(current => current.map(item => item.id === classItem.id ? { ...item, availableSeats } : item));
      void trpcUtils.attendance.history.invalidate();
      void trpcUtils.attendance.counts.invalidate();
      setConfirmationReference(bookingReference.startsWith("#") ? bookingReference : `#${bookingReference}`);
      setConfirmedClass(confirmationClass);
      showToast("success", "Seat reserved", `${confirmationClass.name} is confirmed. Your live attendance history is updated.`);
    } catch (error) {
      const bookingConflictWasRecovered = await handleBookingConflict(error, {
        refreshCatalog: catalogQuery.refetch,
        showConflict,
      });
      if (!bookingConflictWasRecovered) {
        showToast("error", "Reservation unavailable", "Please refresh the catalog and try again.");
      }
    } finally {
      setLoadingClassId(null);
    }
  };

  const handleCancel = async (row: HistoryRow) => {
    if (!row.bookingId || cancelingBookingId) return;
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    setCancelingBookingId(row.bookingId);
    try {
      await cancelMutation.mutateAsync({ bookingId: row.bookingId });
      await Promise.all([trpcUtils.attendance.history.invalidate(), trpcUtils.attendance.counts.invalidate(), catalogQuery.refetch()]);
      showToast("success", "Reservation canceled", "Your seat was released and the live class inventory has been updated.");
    } catch (error) {
      const staleBookingWasRecovered = await handleCancellationFailure(error, {
          refreshHistory: historyQuery.refetch,
          refreshCounts: countsQuery.refetch,
          refreshCatalog: catalogQuery.refetch,
          showToast: ({ title, message }) => showToast("info", title, message),
      });
      if (!staleBookingWasRecovered) {
        showToast("error", "Cancellation unavailable", error instanceof Error ? error.message : "Please refresh and try again.");
      }
    } finally {
      setCancelingBookingId(null);
    }
  };

  const handleInventoryUpdate = async (classId: number, availableSeats: number) => {
    try {
      await ownerInventoryMutation.mutateAsync({ classId, availableSeats });
      await Promise.all([ownerClassesQuery.refetch(), ownerRosterQuery.refetch(), catalogQuery.refetch()]);
      showToast("success", "Inventory updated", "The class inventory and live seat cache are now synchronized.");
    } catch (error) {
      showToast("error", "Inventory update failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleCreateClass = async (event: import("react").FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const created = await ownerCreateMutation.mutateAsync({
        name: String(values.get("name") ?? ""),
        trainer: String(values.get("trainer") ?? ""),
        scheduledTime: new Date(String(values.get("scheduledTime") ?? "")),
        durationMinutes: Number(values.get("durationMinutes") ?? 50),
        location: String(values.get("location") ?? ""),
        capacity: Number(values.get("capacity") ?? 20),
        availableSeats: Number(values.get("availableSeats") ?? 20),
        category: String(values.get("category") ?? "fitness"),
        imageUrl: null,
      });
      form.reset();
      if (created?.id) setOwnerSelectedClassId(created.id);
      await Promise.all([ownerClassesQuery.refetch(), ownerAuditSummaryQuery.refetch(), ownerAuditLogsQuery.refetch(), catalogQuery.refetch()]);
      showToast("success", "Class created", "The new session is now available in the catalog and audit ledger.");
    } catch (error) {
      showToast("error", "Class creation failed", error instanceof Error ? error.message : "Please check the class details.");
    }
  };

  const selectFilter = (filter: "all" | HistoryStatus) => {
    setActiveFilter(filter);
    setPage(1);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup" onClick={() => setView("catalog")} role="button" tabIndex={0} onKeyDown={event => event.key === "Enter" && setView("catalog")}>
          <div className="brand-mark"><Activity size={18} strokeWidth={2.5} /></div>
          <div><span className="brand-name">CureFit</span><span className="brand-caption">MEMBER APP</span></div>
        </div>
        <nav className={`desktop-nav ${mobileNavOpen ? "is-open" : ""}`}>
          <button className={view === "catalog" ? "nav-link active" : "nav-link"} onClick={() => { setView("catalog"); setMobileNavOpen(false); }}><LayoutDashboard size={15} /> Class catalog</button>
          <button className={view === "history" ? "nav-link active" : "nav-link"} onClick={() => { setView("history"); setMobileNavOpen(false); }}><History size={15} /> My attendance</button>
          {user?.role === "Owner" && <button className={view === "owner" ? "nav-link active" : "nav-link"} onClick={() => { setView("owner"); setMobileNavOpen(false); }}><ShieldCheck size={15} /> Owner ops</button>}
        </nav>
        <div className="topbar-actions">
          <div className="connection-pill"><span className={`status-dot ${!liveSyncDegraded ? "online" : "connecting"}`} /> {!liveSyncDegraded ? "Live sync" : fallbackActive ? "Refreshing" : "Reconnecting"}</div>
          <button className="profile-button" onClick={() => user ? undefined : startLogin()} aria-label="Open member profile"><span className="avatar">{(user?.name ?? "AM").slice(0, 2).toUpperCase()}</span><span className="profile-name">{user?.name ?? "Arjun Mehta"}</span><ChevronRight size={15} /></button>
          <button className="mobile-menu" onClick={() => setMobileNavOpen(open => !open)} aria-label="Toggle navigation"><Menu size={19} /></button>
        </div>
      </header>

      <main className="main-content">
        {liveSyncDegraded && <div className="sync-warning" role="status"><WifiOff size={15} /><span>{fallbackActive ? "Live seat streaming is unavailable in this connection. Catalog availability is refreshing every 5 seconds." : "Live seat feed is reconnecting. Catalog availability is refreshing every 5 seconds until sync recovers."}</span></div>}
        {view === "catalog" ? (
          <>
            <section className="page-intro">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> RESERVE YOUR ROUTINE</div>
                <h1>Book Your <span>Fitness Class</span></h1>
                <p>Secure your next session before the room fills. Availability updates live across every member view.</p>
              </div>
              <div className="intro-summary">
                <div className="summary-icon"><CalendarDays size={18} /></div>
                <div><strong>Wednesday, Oct 28</strong><span>6 sessions available today</span></div>
                <MoreHorizontal size={18} className="muted-icon" />
              </div>
            </section>

            <section className="catalog-toolbar">
              <div className="toolbar-label"><span className="toolbar-title">Available sessions</span><span className="toolbar-count">{classes.length.toString().padStart(2, "0")} classes</span></div>
              <div className="toolbar-filters"><button className="filter-chip selected">All locations <ChevronRight size={13} /></button><button className="filter-chip">Morning focus <Clock3 size={13} /></button></div>
            </section>

            <section className="class-grid" aria-label="Available fitness classes">
              {catalogQuery.isLoading && !catalogQuery.data && !catalogTimedOut && <CatalogSkeleton />}
              {catalogTimedOut && !catalogQuery.data && <div className="data-state warning-state"><WifiOff size={15} /><span>Live catalog is temporarily unavailable. Showing the last known class inventory while retrying.</span></div>}
              {catalogQuery.error && classes.length === 0 && <div className="data-state error-state"><strong>Live catalog unavailable</strong><span>{catalogQuery.error.message}</span><button onClick={() => void catalogQuery.refetch()}>Retry catalog</button></div>}
              {!catalogQuery.isLoading && !catalogQuery.error && classes.length === 0 && <div className="data-state empty-state"><strong>No active classes</strong><span>New sessions will appear here when the schedule opens.</span></div>}
              {(!catalogQuery.isLoading || Boolean(catalogQuery.data) || catalogTimedOut) && classes.length > 0 && classes.map((classItem, index) => {
                const badge = getSeatBadge(classItem.availableSeats);
                const isLoading = loadingClassId === classItem.id;
                return (
                  <article className="class-card" key={classItem.id} style={{ animationDelay: `${index * 45}ms` }}>
                    <div className="class-image-wrap">
                      <img src={classItem.imageUrl} alt={`${classItem.name} class`} loading={index > 2 ? "lazy" : "eager"} decoding="async" fetchPriority={index < 3 ? "high" : "low"} />
                      <div className="image-scrim" />
                      <span className="category-label">{classItem.category}</span>
                      <span className={`seat-badge ${badge.kind}`}>{badge.label}</span>
                      <button className="image-action" aria-label={`View ${classItem.name} details`}><ArrowUpRight size={16} /></button>
                    </div>
                    <div className="class-card-body">
                      <div className="card-heading-row"><div><h2>{classItem.name}</h2><div className="trainer-row"><UserRound size={14} /> {classItem.trainer}</div></div><span className="capacity-label">{classItem.capacity} max</span></div>
                      <div className="class-meta"><span><Clock3 size={14} /> {formatTimeRange(classItem)}</span><span><MapPin size={14} /> {classItem.location}</span></div>
                      <div className="card-footer"><button className={`book-button ${badge.kind === "full" ? "disabled" : ""}`} disabled={badge.kind === "full" || isLoading} onClick={() => handleBook(classItem)}>{isLoading ? <><span className="spinner" /> Reserving</> : badge.kind === "full" ? "Fully Booked" : "Book Class"}</button><span className="verified-label"><ShieldCheck size={13} /> Secure seat</span></div>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="trust-strip"><div className="trust-item"><ShieldCheck size={17} /><span><strong>Atomic reservations</strong> · no double bookings</span></div><div className="trust-item"><Wifi size={17} /><span><strong>Live seat inventory</strong> · syncs in under 200ms</span></div><button className="outline-action" onClick={() => showConflict()}>Replay conflict toast <ArrowUpRight size={14} /></button></section>
          </>
        ) : view === "history" ? (
          <section className="history-view">
            <div className="page-intro history-intro">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> YOUR MOVEMENT LOG</div>
                <h1>My Attendance <span>History</span></h1>
                <p>Track all your past, upcoming, and canceled fitness sessions.</p>
              </div>
              <div className="streak-card"><div className="streak-number">12</div><div><strong>session streak</strong><span>Keep the momentum going</span></div><Sparkles size={18} /></div>
            </div>

            <div className="history-panel">
              <div className="history-tabs" role="tablist" aria-label="Attendance filters">
                {(["all", "attended", "canceled", "upcoming"] as const).map(filter => (
                  <button key={filter} className={`history-tab ${activeFilter === filter ? "active" : ""}`} onClick={() => selectFilter(filter)}><span>{filter === "all" ? "All" : filter[0].toUpperCase() + filter.slice(1)}</span><strong>{counts[filter]}</strong></button>
                ))}
              </div>
              <div className="history-table-head"><span>SESSION</span><span>WHEN</span><span>STATUS</span><span /></div>
              {historyQuery.isLoading && <div className="data-state loading-state"><span className="spinner" /> Loading your attendance history…</div>}
              {historyQuery.error && <div className="data-state error-state"><strong>Attendance history unavailable</strong><span>{historyQuery.error.message}</span><button onClick={() => void historyQuery.refetch()}>Retry history</button></div>}
              {!historyQuery.isLoading && !historyQuery.error && paginatedHistory.length === 0 && <div className="data-state empty-state"><strong>No sessions in this filter</strong><span>Try another status to see more of your movement log.</span></div>}
              <div className="history-list">
                {!historyQuery.error && !historyQuery.isLoading && paginatedHistory.map(row => (
                  <div className="history-row" key={row.id}>
                    <div className="history-session"><div className="session-icon"><Dumbbell size={17} /></div><div><strong>{row.name}</strong><span>{row.trainer}</span></div></div>
                    <div className="history-when"><strong>{row.date}</strong><span>{row.time}</span></div>
                    <div className="history-location"><MapPin size={14} /><span>{row.location}</span></div>
                    <div className={`history-status ${row.status}`}>{row.status === "attended" ? <Check size={13} /> : row.status === "canceled" || row.status === "no_show" ? <X size={13} /> : <Clock3 size={13} />}{statusLabel[row.status]}</div>
                    {row.status === "upcoming" && row.bookingId ? <button className="cancel-button" onClick={() => void handleCancel(row)} disabled={cancelingBookingId === row.bookingId}>{cancelingBookingId === row.bookingId ? "Canceling…" : "Cancel"}</button> : <button className="details-button">View details <ArrowUpRight size={13} /></button>}
                  </div>
                ))}
              </div>
              <div className="pagination"><span>Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, filteredHistory.length)} of {counts[activeFilter] ?? counts.all} records</span><div className="pagination-actions"><button disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}><ChevronLeft size={15} /> Prev</button><button className="current-page">{page}</button><button onClick={() => setPage(current => current + 1)} disabled={filteredHistory.length <= page * 10}>2</button><span>...</span><button disabled={filteredHistory.length <= page * 10} onClick={() => setPage(current => current + 1)}>Next <ChevronRight size={15} /></button></div></div>
            </div>
          </section>
        ) : (
          <section className="owner-view">
            <div className="page-intro history-intro">
              <div><div className="eyebrow"><span className="eyebrow-line" /> OPERATIONS CONSOLE</div><h1>Owner <span>Control Room</span></h1><p>Manage class capacity, review rosters, and monitor operator activity with auditable changes.</p></div>
              <div className="streak-card"><div className="streak-number">{ownerClassesQuery.data?.length ?? 0}</div><div><strong>active classes</strong><span>Inventory under watch</span></div><ShieldCheck size={18} /></div>
            </div>
            <div className="owner-grid">
              <section className="owner-panel"><div className="panel-heading"><div><span className="eyebrow">CLASS INVENTORY</span><h2>Live capacity controls</h2></div><Wifi size={17} /></div>
                {ownerClassesQuery.isLoading && <div className="data-state loading-state"><span className="spinner" /> Loading owner inventory…</div>}
                {ownerClassesQuery.error && <div className="data-state error-state"><strong>Owner inventory unavailable</strong><span>{ownerClassesQuery.error.message}</span></div>}
                {!ownerClassesQuery.isLoading && !ownerClassesQuery.error && (ownerClassesQuery.data ?? []).length === 0 && <div className="data-state empty-state"><strong>No active classes</strong><span>Create the first class below to open inventory.</span></div>}
                {!ownerClassesQuery.isLoading && !ownerClassesQuery.error && (ownerClassesQuery.data ?? []).map(item => (
                  <div className="owner-class-row" key={item.id}><div><strong>{item.name}</strong><span>{item.location} · {item.availableSeats}/{item.capacity} seats</span></div><div className="owner-inventory-actions"><button onClick={() => void handleInventoryUpdate(item.id, Math.max(0, item.availableSeats - 1))} aria-label={`Decrease ${item.name} inventory`}>−</button><span>{item.availableSeats}</span><button onClick={() => void handleInventoryUpdate(item.id, Math.min(item.capacity, item.availableSeats + 1))} aria-label={`Increase ${item.name} inventory`}>+</button></div></div>
                ))}
              </section>
              <section className="owner-panel"><div className="panel-heading"><div><span className="eyebrow">AUDIT SUMMARY</span><h2>Operator activity</h2></div><Activity size={17} /></div>
                {ownerAuditSummaryQuery.isLoading && <div className="data-state loading-state"><span className="spinner" /> Loading audit summary…</div>}
                {ownerAuditSummaryQuery.error && <div className="data-state error-state"><strong>Audit summary unavailable</strong><span>{ownerAuditSummaryQuery.error.message}</span></div>}
                {!ownerAuditSummaryQuery.isLoading && !ownerAuditSummaryQuery.error && (ownerAuditSummaryQuery.data ?? []).length === 0 && <div className="data-state empty-state"><strong>No audit activity yet</strong><span>Owner changes will appear here after the first operation.</span></div>}
                <div className="audit-list">{(ownerAuditSummaryQuery.data ?? []).map((item, index) => <div className="audit-row" key={`${item.action}-${item.operatorEmail ?? "operator"}-${index}`}><div><strong>{item.action.replaceAll("_", " ")}</strong><span>{item.operatorEmail ?? "Owner operator"}</span></div><b>{item.totalActions}</b></div>)}</div>
              </section>
              <section className="owner-panel class-create-panel"><div className="panel-heading"><div><span className="eyebrow">SCHEDULE CONTROL</span><h2>Create a new class</h2></div><CalendarDays size={17} /></div>
                <form className="owner-create-form" onSubmit={handleCreateClass}>
                  <input name="name" placeholder="Class name" required minLength={2} />
                  <input name="trainer" placeholder="Trainer" required minLength={2} />
                  <input name="location" placeholder="Location" required minLength={2} />
                  <input name="category" placeholder="Category" defaultValue="fitness" required minLength={2} />
                  <input name="scheduledTime" type="datetime-local" defaultValue="2026-10-28T07:00" required />
                  <input name="durationMinutes" type="number" min="15" defaultValue="50" required />
                  <input name="capacity" type="number" min="1" defaultValue="20" required />
                  <input name="availableSeats" type="number" min="0" defaultValue="20" required />
                  <button className="book-button" type="submit" disabled={ownerCreateMutation.isPending}>{ownerCreateMutation.isPending ? "Creating…" : "Create class"}</button>
                </form>
              </section>
            </div>
            <div className="owner-detail-grid">
              <section className="owner-panel"><div className="panel-heading"><div><span className="eyebrow">CLASS ROSTER</span><h2>Reserved members</h2></div><UserRound size={17} /></div>
                <label className="owner-select-label">Class<select className="owner-class-select" value={ownerSelectedClassId} onChange={event => setOwnerSelectedClassId(Number(event.target.value))}>{(ownerClassesQuery.data ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                {ownerRosterQuery.isLoading && <div className="data-state loading-state"><span className="spinner" /> Loading roster…</div>}
                {ownerRosterQuery.error && <div className="data-state error-state"><strong>Roster unavailable</strong><span>{ownerRosterQuery.error.message}</span></div>}
                {!ownerRosterQuery.isLoading && !ownerRosterQuery.error && (ownerRosterQuery.data ?? []).length === 0 && <div className="data-state empty-state"><strong>No active reservations</strong><span>This class has no booked members yet.</span></div>}
                <div className="roster-list">{(ownerRosterQuery.data ?? []).map(member => <div className="roster-row" key={member.bookingId}><div className="session-icon"><UserRound size={15} /></div><div><strong>{member.memberName ?? "Member"}</strong><span>{member.memberEmail ?? "No email"} · {member.bookingReference}</span></div><span className="history-status upcoming">{member.status.toUpperCase()}</span></div>)}</div>
              </section>
              <section className="owner-panel"><div className="panel-heading"><div><span className="eyebrow">AUDIT LOG</span><h2>Recent changes</h2></div><History size={17} /></div>
                {ownerAuditLogsQuery.isLoading && <div className="data-state loading-state"><span className="spinner" /> Loading audit log…</div>}
                {ownerAuditLogsQuery.error && <div className="data-state error-state"><strong>Audit log unavailable</strong><span>{ownerAuditLogsQuery.error.message}</span></div>}
                {!ownerAuditLogsQuery.isLoading && !ownerAuditLogsQuery.error && (ownerAuditLogsQuery.data ?? []).length === 0 && <div className="data-state empty-state"><strong>No recent changes</strong><span>Every Owner mutation is recorded here.</span></div>}
                <div className="audit-list">{(ownerAuditLogsQuery.data ?? []).slice(0, 8).map(log => <div className="audit-row" key={log.id}><div><strong>{log.action.replaceAll("_", " ")}</strong><span>{log.operatorEmail ?? log.operatorName ?? "Owner operator"} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(log.createdAt))}</span></div><b>•</b></div>)}</div>
              </section>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer"><span>© 2026 CureFit Technologies</span><span>Built for consistent movement <span className="footer-dot" /> <button onClick={() => setView("history")}>Activity ledger</button></span></footer>

      {confirmedClass && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
          <div className="confirmation-modal">
            <button className="modal-close" onClick={() => setConfirmedClass(null)} aria-label="Close confirmation"><X size={18} /></button>
            <div className="success-icon"><Check size={31} strokeWidth={2.5} /></div>
            <div className="modal-kicker">RESERVATION CONFIRMED</div>
            <h2 id="confirmation-title">Seat Reserved<br /><span>Successfully!</span></h2>
            <p>Your seat for <strong>{confirmedClass.name}</strong> ({formatTimeRange(confirmedClass)}) is locked. Seat inventory updated across all users.</p>
            <div className="confirmation-summary">
              <div><span>CLASS NAME</span><strong>{confirmedClass.name}</strong></div><div><span>DATE &amp; TIME</span><strong>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(confirmedClass.scheduledTime))} · {formatTimeRange(confirmedClass)}</strong></div><div><span>TRAINER</span><strong>{confirmedClass.trainer}</strong></div><div><span>LOCATION</span><strong>{confirmedClass.location}</strong></div><div className="reference-cell"><span>BOOKING REFERENCE</span><strong>{confirmationReference}</strong></div>
            </div>
            <button className="modal-primary" onClick={() => { setConfirmedClass(null); setView("history"); }}>View Attendance History <ArrowUpRight size={16} /></button>
            <button className="modal-secondary" onClick={() => setConfirmedClass(null)}>Back to Class Listings</button>
          </div>
        </div>
      )}

      {toast && (() => {
        const ToastIcon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warning" || toast.tone === "error" ? CircleAlert : Info;
        const isUrgent = toast.tone === "error" || toast.tone === "warning";
        return <div className={`toast conflict-toast toast-${toast.tone}`} role={isUrgent ? "alert" : "status"} aria-live={isUrgent ? "assertive" : "polite"}><div className="toast-icon"><ToastIcon size={18} /></div><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button onClick={dismissToast} aria-label="Dismiss notification"><X size={15} /></button></div>;
      })()}
    </div>
  );
}
