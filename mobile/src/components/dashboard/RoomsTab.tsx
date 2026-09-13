import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Droplet,
  Gauge,
  Home,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Zap,
} from "lucide-react-native";
import {
  createInvoice,
  deleteListing,
  replaceLease,
  saveListing,
  saveMeterReading,
  updateLeaseStatus,
  type ListingDraft,
} from "@/lib/api/dashboard";
import { confirm } from "@/lib/confirm";
import { formatDate, formatDistance, formatVND, today } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import {
  ROOM_STATUS_COLOR,
  ROOM_STATUS_LABEL,
  STATUS_ORDER,
  currentPeriod,
  toRoomStatus,
  type Invoice,
  type Lease,
  type Listing,
  type MeterReading,
  type RoomStatus,
  type Tenant,
} from "@/lib/dashboard-types";
import type { VerificationLevel } from "@/lib/database.types";
import { VERIFICATION_COLOR, VERIFICATION_LABEL, toVerification } from "@/lib/verification";
import {
  MODERATION_COLOR,
  MODERATION_LABEL,
  MODERATION_NOTE,
  toModeration,
} from "@/lib/moderation";
import { toast } from "../Toast";
import {
  AccentButton,
  Badge,
  Divider,
  EmptyState,
  Field,
  IconButton,
  Muted,
  PrimaryButton,
  SecondaryButton,
  Select,
  Sheet,
  TextInput,
  Title,
} from "../ui";
import { LocationPicker } from "../LocationPicker";
import { RecordCard, TabHeader } from "./ui";
import type { TabProps } from "./types";
import { colors, font, radius } from "@/theme";

type RoomRow = Listing & {
  tenantName: string | null;
  leaseRent: number | null;
  unpaidCount: number;
  unpaidTotal: number;
  currentMeter: MeterReading | null;
  prevMeter: MeterReading | null;
  currentInvoice: Invoice | null;
};

export function RoomsTab({ data, reload }: TabProps) {
  const { listings, leases, tenants, invoices, meters } = data;

  const [editing, setEditing] = useState<Listing | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatus | "all">("all");
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const period = currentPeriod();

  const rows: RoomRow[] = useMemo(
    () =>
      listings.map((l) => {
        const active = leases.find((x) => x.listing_id === l.id && x.status === "active");
        const tenant = active ? tenants.find((t) => t.id === active.tenant_id) : null;
        const roomInvoices = invoices.filter((i) => i.listing_id === l.id);
        const unpaid = roomInvoices.filter((i) => i.status !== "paid");
        const roomMeters = meters.filter((m) => m.listing_id === l.id);
        return {
          ...l,
          tenantName: tenant?.full_name ?? null,
          leaseRent: active?.monthly_rent ?? null,
          unpaidCount: unpaid.length,
          unpaidTotal: unpaid.reduce((s, i) => s + i.total_amount, 0),
          currentMeter: roomMeters.find((m) => m.period === period) ?? null,
          prevMeter: roomMeters.find((m) => m.period < period) ?? null,
          currentInvoice: roomInvoices.find((i) => i.period === period) ?? null,
        };
      }),
    [listings, leases, tenants, invoices, meters, period],
  );

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.tenantName ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: rows.length,
    available: rows.filter((r) => r.status === "available").length,
    occupied: rows.filter((r) => r.status === "occupied").length,
    maintenance: rows.filter((r) => r.status === "maintenance").length,
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm(
      "Xoá phòng này? Các hợp đồng, hoá đơn và chỉ số liên quan cũng sẽ bị xoá.",
    );
    if (!ok) return;
    try {
      await deleteListing(id);
      toast.success("Đã xoá phòng");
      setDetailsId(null);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không xoá được phòng"));
    }
  };

  const detailsRow = detailsId ? (rows.find((r) => r.id === detailsId) ?? null) : null;
  const detailsLease = detailsRow
    ? (leases.find((l) => l.listing_id === detailsRow.id && l.status === "active") ?? null)
    : null;
  const detailsTenant = detailsLease
    ? (tenants.find((t) => t.id === detailsLease.tenant_id) ?? null)
    : null;
  const detailsInvoices = detailsRow
    ? invoices
        .filter((i) => i.listing_id === detailsRow.id)
        .sort((a, b) => b.period.localeCompare(a.period))
        .slice(0, 6)
    : [];

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <View>
      <TabHeader
        title="Phòng trọ"
        subtitle={`${counts.all} phòng · ${counts.occupied} đã thuê · ${counts.available} trống`}
        action={
          <AccentButton
            label="Thêm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            onPress={openNew}
          />
        }
      />

      <View style={styles.searchWrap}>
        <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo tên phòng hoặc người thuê..."
          style={{ paddingLeft: 42 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
      >
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const on = statusFilter === s;
          const label = s === "all" ? "Tất cả" : ROOM_STATUS_LABEL[s];
          return (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.filterChip, on && styles.filterChipActive]}
            >
              <Text style={[styles.filterLabel, on && styles.filterLabelActive]}>{label}</Text>
              <View style={[styles.filterCount, on && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, on && styles.filterLabelActive]}>
                  {counts[s]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Home size={44} color={colors.tint400} />}
          title="Chưa có phòng nào"
          description="Thêm phòng đầu tiên để bắt đầu quản lý người thuê, chỉ số và hoá đơn."
          action={
            <AccentButton
              label="Thêm phòng"
              icon={<Plus size={16} color={colors.primaryForeground} />}
              onPress={openNew}
            />
          }
        />
      ) : filtered.length === 0 ? (
        <Muted style={{ textAlign: "center", paddingVertical: 32 }}>
          Không tìm thấy phòng phù hợp.
        </Muted>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((r) => {
            const status = toRoomStatus(r.status);
            const tone = ROOM_STATUS_COLOR[status];
            return (
              <RecordCard
                key={r.id}
                onPress={() => setDetailsId(r.id)}
                title={r.title}
                subtitle={
                  <View style={styles.flagRow}>
                    <Badge
                      label={ROOM_STATUS_LABEL[status]}
                      bg={tone.bg}
                      fg={tone.fg}
                      border={tone.border}
                    />
                    {r.is_published ? (
                      <Badge
                        label="Đang đăng"
                        bg={colors.emerald.bg}
                        fg={colors.emerald.fg}
                        border={colors.emerald.border}
                      />
                    ) : null}
                    {r.is_published || toModeration(r.moderation_status) === "rejected" ? (
                      <Badge
                        label={MODERATION_LABEL[toModeration(r.moderation_status)]}
                        bg={MODERATION_COLOR[toModeration(r.moderation_status)].bg}
                        fg={MODERATION_COLOR[toModeration(r.moderation_status)].fg}
                        border={MODERATION_COLOR[toModeration(r.moderation_status)].border}
                        icon={
                          <BadgeCheck
                            size={10}
                            color={MODERATION_COLOR[toModeration(r.moderation_status)].fg}
                          />
                        }
                      />
                    ) : null}
                    {r.is_published ? (
                      <Badge
                        label={VERIFICATION_LABEL[toVerification(r.verification)]}
                        bg={VERIFICATION_COLOR[toVerification(r.verification)].bg}
                        fg={VERIFICATION_COLOR[toVerification(r.verification)].fg}
                        border={VERIFICATION_COLOR[toVerification(r.verification)].border}
                        icon={
                          <ShieldCheck
                            size={10}
                            color={VERIFICATION_COLOR[toVerification(r.verification)].fg}
                          />
                        }
                      />
                    ) : null}
                    {r.status === "occupied" && !r.currentMeter ? (
                      <Badge
                        label="Chưa ghi"
                        bg={colors.amber.bg}
                        fg={colors.amber.fg}
                        border={colors.amber.border}
                        icon={<AlertCircle size={10} color={colors.amber.fg} />}
                      />
                    ) : null}
                    {r.status === "occupied" && r.currentMeter && !r.currentInvoice ? (
                      <Badge
                        label="Chờ tạo HĐ"
                        bg={colors.blue.bg}
                        fg={colors.blue.fg}
                        border={colors.blue.border}
                        icon={<Receipt size={10} color={colors.blue.fg} />}
                      />
                    ) : null}
                  </View>
                }
                badge={
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.rent}>{formatVND(r.leaseRent ?? r.price)}</Text>
                    <Text style={styles.rentUnit}>/tháng</Text>
                  </View>
                }
                rows={[
                  { label: "Người thuê", value: r.tenantName ?? "Chưa có" },
                  { label: "Diện tích", value: r.size ? `${r.size} m²` : "—" },
                  {
                    label: "Cách trường",
                    value:
                      r.distance_to_school != null
                        ? `${formatDistance(r.distance_to_school)}${r.school_name ? ` · ${r.school_name}` : ""}`
                        : "—",
                  },
                  { label: "Giá điện", value: `${formatVND(r.electricity_rate)}/kWh` },
                  { label: "Giá nước", value: `${formatVND(r.water_rate)}/m³` },
                ]}
                actions={
                  <>
                    {r.unpaidCount > 0 ? (
                      <Text style={styles.debt}>
                        {r.unpaidCount} hoá đơn chưa thu · {formatVND(r.unpaidTotal)}
                      </Text>
                    ) : null}
                    <IconButton
                      accessibilityLabel="Sửa"
                      onPress={() => {
                        setEditing(r);
                        setShowForm(true);
                      }}
                    >
                      <Pencil size={16} color={colors.mutedForeground} />
                    </IconButton>
                    <IconButton accessibilityLabel="Xoá" onPress={() => void handleDelete(r.id)}>
                      <Trash2 size={16} color={colors.destructive} />
                    </IconButton>
                  </>
                }
              />
            );
          })}
        </View>
      )}

      <RoomForm
        open={showForm}
        initial={editing}
        tenants={tenants}
        activeLease={
          editing
            ? (leases.find((l) => l.listing_id === editing.id && l.status === "active") ?? null)
            : null
        }
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />

      <RoomDetails
        open={!!detailsRow}
        period={period}
        row={detailsRow}
        lease={detailsLease}
        tenant={detailsTenant}
        invoices={detailsInvoices}
        onClose={() => setDetailsId(null)}
        onChanged={reload}
        onEdit={() => {
          if (!detailsRow) return;
          setEditing(detailsRow);
          setDetailsId(null);
          setShowForm(true);
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------- room form */

function RoomForm({
  open,
  initial,
  tenants,
  activeLease,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Listing | null;
  tenants: Tenant[];
  activeLease: Lease | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState<RoomStatus>("available");
  const [electricityRate, setElectricityRate] = useState("3500");
  const [waterRate, setWaterRate] = useState("25000");
  const [description, setDescription] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [saving, setSaving] = useState(false);

  const [showPublic, setShowPublic] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publicTitle, setPublicTitle] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [district, setDistrict] = useState("");
  const [amenities, setAmenities] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [school, setSchool] = useState("");
  const [distance, setDistance] = useState("");
  const [verification, setVerification] = useState<VerificationLevel>("unverified");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setPrice(initial?.price != null ? String(initial.price) : "");
    setSize(initial?.size != null ? String(initial.size) : "");
    setStatus(initial ? toRoomStatus(initial.status) : "available");
    setElectricityRate(String(initial?.electricity_rate ?? 3500));
    setWaterRate(String(initial?.water_rate ?? 25000));
    setDescription(initial?.description ?? "");
    setTenantId(activeLease?.tenant_id ?? "");
    setIsPublished(initial?.is_published ?? false);
    setShowPublic(initial?.is_published ?? false);
    setPublicTitle(initial?.public_title ?? "");
    setPublicDescription(initial?.public_description ?? "");
    setAddress(initial?.address ?? "");
    setArea(initial?.area ?? "");
    setDistrict(initial?.district ?? "");
    setAmenities((initial?.amenities ?? []).join(", "));
    setLat(initial?.lat != null ? String(initial.lat) : "");
    setLng(initial?.lng != null ? String(initial.lng) : "");
    setSchool(initial?.school_name ?? "");
    setDistance(initial?.distance_to_school != null ? String(initial.distance_to_school) : "");
    setVerification(toVerification(initial?.verification));
  }, [open, initial, activeLease]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên phòng.");
      return;
    }
    const priceValue = Number(price);
    const sizeValue = size.trim() ? Number(size) : null;
    const electricityRateValue = electricityRate.trim() ? Number(electricityRate) : NaN;
    const waterRateValue = waterRate.trim() ? Number(waterRate) : NaN;
    const latValue = lat.trim() ? Number(lat) : null;
    const lngValue = lng.trim() ? Number(lng) : null;
    const distanceValue = distance.trim() ? Number(distance) : null;
    if (!Number.isInteger(priceValue) || priceValue <= 0) {
      toast.error("Giá thuê phải là số nguyên lớn hơn 0.");
      return;
    }
    if (
      (sizeValue !== null && (!Number.isInteger(sizeValue) || sizeValue <= 0)) ||
      !Number.isInteger(electricityRateValue) ||
      electricityRateValue < 0 ||
      !Number.isInteger(waterRateValue) ||
      waterRateValue < 0
    ) {
      toast.error("Diện tích và đơn giá phải là số nguyên hợp lệ.");
      return;
    }
    if (status === "occupied" && !tenantId) {
      toast.error("Vui lòng chọn người thuê cho phòng này.");
      return;
    }
    // Mirrors the `listings_publishable` constraint so the user gets a useful
    // message instead of a check-violation from Postgres.
    if (isPublished && (!publicTitle.trim() || !address.trim() || !lat.trim() || !lng.trim())) {
      toast.error("Tin đăng công khai cần tên, địa chỉ và toạ độ (lat/lng).");
      return;
    }
    // Cùng giới hạn với `listings_distance_check` trong schema.
    if (
      distance &&
      (distanceValue === null ||
        !Number.isInteger(distanceValue) ||
        distanceValue < 0 ||
        distanceValue > 50000)
    ) {
      toast.error("Khoảng cách tới trường phải từ 0 đến 50.000 m.");
      return;
    }
    if (
      (latValue !== null || lngValue !== null) &&
      (latValue === null || lngValue === null ||
        !Number.isFinite(latValue) ||
        !Number.isFinite(lngValue) ||
        latValue < -90 ||
        latValue > 90 ||
        lngValue < -180 ||
        lngValue > 180)
    ) {
      toast.error("Toạ độ phải nằm trong lat -90..90 và lng -180..180.");
      return;
    }

    setSaving(true);
    try {
      const draft: ListingDraft = {
        id: initial?.id,
        title: title.trim(),
        description: description || null,
        price: priceValue,
        size: sizeValue,
        status,
        electricity_rate: electricityRateValue,
        water_rate: waterRateValue,
        is_published: isPublished,
        public_title: publicTitle.trim() || null,
        public_description: publicDescription || null,
        address: address.trim() || null,
        area: area.trim() || null,
        district: district.trim() || null,
        amenities: amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        lat: latValue,
        lng: lngValue,
        school_name: school.trim() || null,
        distance_to_school: distanceValue,
        verification,
      };

      // End an old lease before changing the room to available/maintenance.
      // The lease trigger then leaves the room in a safe available state if
      // saving the listing fails afterwards.
      if (status !== "occupied" && activeLease) {
        await updateLeaseStatus(activeLease.id, "ended");
      }

      const saved = await saveListing(draft);

      if (status === "occupied" && tenantId) {
        const unchanged = activeLease && activeLease.tenant_id === tenantId;
        if (!unchanged) {
          await replaceLease(activeLease?.id ?? null, {
            listing_id: saved.id,
            tenant_id: tenantId,
            start_date: today(),
            end_date: null,
            monthly_rent: priceValue,
            deposit: 0,
            notes: null,
          });
        }
      }

      // Chủ trọ cần biết ngay là tin chưa lên: trigger đẩy tin về hàng chờ
      // mỗi lần nội dung công khai đổi, và im lặng ở đây thì họ sẽ đi tìm tin
      // của mình trên trang Khám phá mà không thấy.
      const queued = isPublished && toModeration(saved.moderation_status) === "pending";
      toast.success(
        queued
          ? "Đã lưu. Tin đang chờ quản trị viên duyệt trước khi hiện công khai."
          : initial
            ? "Đã cập nhật phòng"
            : "Đã thêm phòng",
      );
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Không lưu được phòng"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      title={initial ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Huỷ" onPress={onClose} style={{ flex: 1 }} />
          <PrimaryButton
            label={saving ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Thêm phòng"}
            disabled={saving}
            onPress={() => void submit()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Field label="Tên / mã phòng">
        <TextInput value={title} onChangeText={setTitle} placeholder="VD: P.101 — Tầng 1" />
      </Field>

      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <Field label="Giá thuê / tháng">
            <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Diện tích (m²)">
            <TextInput value={size} onChangeText={setSize} keyboardType="number-pad" />
          </Field>
        </View>
      </View>

      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <Field label="Giá điện / kWh">
            <TextInput
              value={electricityRate}
              onChangeText={setElectricityRate}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Giá nước / m³">
            <TextInput value={waterRate} onChangeText={setWaterRate} keyboardType="number-pad" />
          </Field>
        </View>
      </View>

      <Field label="Trạng thái">
        <View style={styles.statusRow}>
          {STATUS_ORDER.map((s) => {
            const on = status === s;
            const tone = ROOM_STATUS_COLOR[s];
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.statusOption, on && { backgroundColor: tone.bg, borderColor: tone.fg }]}
              >
                <Text
                  style={[
                    styles.statusOptionLabel,
                    on && { color: tone.fg, fontFamily: font.semibold },
                  ]}
                >
                  {ROOM_STATUS_LABEL[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {status === "occupied" ? (
        <Field
          label="Người thuê hiện tại"
          hint={
            activeLease && tenantId && activeLease.tenant_id !== tenantId
              ? "Hợp đồng cũ sẽ được kết thúc và tạo hợp đồng mới cho người thuê này."
              : undefined
          }
        >
          {tenants.length === 0 ? (
            <View style={styles.note}>
              <Muted size={12}>
                Chưa có người thuê. Vào tab &quot;Người thuê&quot; để thêm trước.
              </Muted>
            </View>
          ) : (
            <Select
              title="Chọn người thuê"
              value={tenantId}
              onChange={setTenantId}
              placeholder="— Chọn người thuê —"
              options={tenants.map((t) => ({
                label: t.phone ? `${t.full_name} · ${t.phone}` : t.full_name,
                value: t.id,
              }))}
            />
          )}
        </Field>
      ) : null}

      <Field label="Ghi chú nội bộ" hint="Chỉ bạn nhìn thấy, không hiện trên tin đăng.">
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Ghi chú dành riêng cho chủ trọ (thiết bị, lưu ý...)"
        />
      </Field>

      <Pressable onPress={() => setShowPublic((v) => !v)} style={styles.disclosure}>
        <Text style={styles.disclosureLabel}>Tin đăng công khai</Text>
        <Text style={styles.disclosureHint}>{showPublic ? "Ẩn" : "Mở"}</Text>
      </Pressable>

      {showPublic ? (
        <View style={{ gap: 16 }}>
          <Pressable
            onPress={() => setIsPublished((v) => !v)}
            style={[styles.toggle, isPublished && styles.toggleOn]}
          >
            <Text style={[styles.toggleLabel, isPublished && { color: colors.primary }]}>
              {isPublished ? "✓ Đang hiển thị công khai" : "Chưa đăng — chỉ bạn thấy"}
            </Text>
          </Pressable>

          <Field label="Tên hiển thị công khai">
            <TextInput
              value={publicTitle}
              onChangeText={setPublicTitle}
              placeholder="VD: Phòng Studio Ban Công Xanh"
            />
          </Field>
          <Field label="Mô tả công khai">
            <TextInput value={publicDescription} onChangeText={setPublicDescription} multiline />
          </Field>
          <Field label="Khu vực">
            <TextInput value={area} onChangeText={setArea} placeholder="VD: Phường Quang Trung" />
          </Field>
          <Field label="Khu / mốc gần đó">
            <TextInput
              value={district}
              onChangeText={setDistrict}
              placeholder="VD: Gần ĐH Sư Phạm"
            />
          </Field>
          <LocationPicker
            address={address}
            onAddressChange={setAddress}
            lat={lat}
            lng={lng}
            onCoordsChange={(nextLat, nextLng) => {
              setLat(nextLat);
              setLng(nextLng);
            }}
          />
          <View style={styles.pair}>
            <View style={{ flex: 2 }}>
              <Field label="Trường gần nhất">
                <TextInput
                  value={school}
                  onChangeText={setSchool}
                  placeholder="VD: ĐH Sư Phạm Thái Nguyên"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Cách trường (m)">
                <TextInput
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="number-pad"
                  placeholder="450"
                />
              </Field>
            </View>
          </View>
          <Field label="Tiện ích" hint="Ngăn cách bằng dấu phẩy">
            <TextInput
              value={amenities}
              onChangeText={setAmenities}
              placeholder="Điều hòa, Ban công, Wifi"
            />
          </Field>
          <View style={styles.note}>
            <Muted size={12}>
              Tin đăng mới, và mỗi lần sửa nội dung công khai của tin đã duyệt, đều vào hàng chờ
              duyệt của quản trị viên trước khi hiện với người tìm trọ.
            </Muted>
          </View>

          <Field
            label="Xác thực tin đăng"
            hint="Quản trị viên đối chiếu giấy tờ chủ trọ và địa chỉ phòng trước khi cấp huy hiệu."
          >
            <View
              style={[
                styles.verifyRow,
                {
                  backgroundColor: VERIFICATION_COLOR[verification].bg,
                  borderColor: VERIFICATION_COLOR[verification].border,
                },
              ]}
            >
              <ShieldCheck size={16} color={VERIFICATION_COLOR[verification].fg} />
              <Text style={[styles.verifyLabel, { color: VERIFICATION_COLOR[verification].fg }]}>
                {VERIFICATION_LABEL[verification]}
              </Text>
            </View>
            {verification === "verified" ? (
              <View style={styles.note}>
                <Muted size={12}>Tin đã được duyệt. Sửa nội dung không làm mất huy hiệu.</Muted>
              </View>
            ) : (
              <SecondaryButton
                label={verification === "pending" ? "Huỷ yêu cầu xác thực" : "Gửi yêu cầu xác thực"}
                onPress={() =>
                  setVerification(verification === "pending" ? "unverified" : "pending")
                }
                style={{ marginTop: 8 }}
              />
            )}
          </Field>

          <Muted size={11}>
            Ảnh phòng tải lên qua Supabase Storage — xem `scripts/seed.ts` trong repo.
          </Muted>
        </View>
      ) : null}
    </Sheet>
  );
}

/* ------------------------------------------------------ moderation notice */

/**
 * Kết quả kiểm duyệt của quản trị viên, nói bằng tiếng của chủ trọ.
 *
 * Tin bị từ chối là trường hợp quan trọng nhất: không có hộp này thì chủ trọ
 * chỉ thấy tin của mình biến mất khỏi trang Khám phá mà không biết vì sao,
 * cũng không biết sửa gì để được đăng lại.
 */
function ModerationNotice({ row }: { row: Listing }) {
  const moderation = toModeration(row.moderation_status);
  if (!row.is_published && moderation === "approved") return null;

  const tone = MODERATION_COLOR[moderation];
  return (
    <View style={[styles.moderationBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.moderationTitle, { color: tone.fg }]}>
        {MODERATION_LABEL[moderation]}
      </Text>
      <Text style={[styles.moderationNote, { color: tone.fg }]}>{MODERATION_NOTE[moderation]}</Text>
      {moderation === "rejected" && row.moderation_note ? (
        <Text style={[styles.moderationReason, { color: tone.fg }]}>
          Lý do: {row.moderation_note}
        </Text>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------- room details */

function RoomDetails({
  open,
  period,
  row,
  lease,
  tenant,
  invoices,
  onClose,
  onEdit,
  onChanged,
}: {
  open: boolean;
  period: string;
  row: RoomRow | null;
  lease: Lease | null;
  tenant: Tenant | null;
  invoices: Invoice[];
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [showMeter, setShowMeter] = useState(false);
  const [eStart, setEStart] = useState("");
  const [eEnd, setEEnd] = useState("");
  const [wStart, setWStart] = useState("");
  const [wEnd, setWEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const cm = row?.currentMeter ?? null;
  const pm = row?.prevMeter ?? null;

  // Seed the meter draft from this period's reading, falling back to the
  // previous period's closing numbers — the usual case is "carry last month's
  // end forward as this month's start".
  useEffect(() => {
    if (!open) return;
    setShowMeter(false);
    setEStart(String(cm?.electricity_start ?? pm?.electricity_end ?? 0));
    setEEnd(cm?.electricity_end != null ? String(cm.electricity_end) : "");
    setWStart(String(cm?.water_start ?? pm?.water_end ?? 0));
    setWEnd(cm?.water_end != null ? String(cm.water_end) : "");
  }, [open, cm, pm]);

  if (!row) return null;

  const status = toRoomStatus(row.status);
  const tone = ROOM_STATUS_COLOR[status];
  const kwhUsed = cm ? Math.max(0, cm.electricity_end - cm.electricity_start) : 0;
  const m3Used = cm ? Math.max(0, cm.water_end - cm.water_start) : 0;
  const eAmt = kwhUsed * row.electricity_rate;
  const wAmt = m3Used * row.water_rate;

  const saveMeter = async () => {
    if ([eStart, eEnd, wStart, wEnd].some((value) => !value.trim())) {
      toast.error("Vui lòng nhập đủ bốn chỉ số điện nước.");
      return;
    }
    const values = [eStart, eEnd, wStart, wEnd].map(Number);
    if (
      values.some((value) => !Number.isInteger(value) || value < 0) ||
      values[1] < values[0] ||
      values[3] < values[2]
    ) {
      toast.error("Chỉ số phải là số nguyên không âm và chỉ số cuối không nhỏ hơn đầu.");
      return;
    }
    setBusy(true);
    try {
      await saveMeterReading({
        listing_id: row.id,
        period,
        electricity_start: values[0],
        electricity_end: values[1],
        water_start: values[2],
        water_end: values[3],
      });
      toast.success(`Đã lưu chỉ số kỳ ${period}`);
      setShowMeter(false);
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e, "Không lưu được chỉ số"));
    } finally {
      setBusy(false);
    }
  };

  const createInvoiceForPeriod = async () => {
    if (!cm) {
      toast.error("Hãy ghi chỉ số điện nước kỳ này trước.");
      return;
    }
    if (row.currentInvoice) {
      toast.info("Hoá đơn kỳ này đã tồn tại.");
      return;
    }
    const rent = row.leaseRent ?? row.price;
    const total = rent + eAmt + wAmt;

    setBusy(true);
    try {
      await createInvoice({
        lease_id: lease?.id ?? null,
        listing_id: row.id,
        tenant_id: tenant?.id ?? null,
        period,
        rent_amount: rent,
        electricity_kwh: kwhUsed,
        electricity_amount: eAmt,
        water_m3: m3Used,
        water_amount: wAmt,
        other_amount: 0,
        total_amount: total,
        due_date: null,
        notes: null,
      });
      toast.success(`Đã tạo hoá đơn kỳ ${period} · ${formatVND(total)}`);
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e, "Không tạo được hoá đơn"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      title={row.title}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton label="Đóng" onPress={onClose} style={{ flex: 1 }} />
          <PrimaryButton
            label="Chỉnh sửa"
            icon={<Pencil size={16} color={colors.primaryForeground} />}
            onPress={onEdit}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <ModerationNotice row={row} />

      <View style={styles.detailHead}>
        <Badge label={ROOM_STATUS_LABEL[status]} bg={tone.bg} fg={tone.fg} border={tone.border} />
        {row.size ? <Muted size={12}>{row.size} m²</Muted> : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.rent}>
          {formatVND(row.leaseRent ?? row.price)}
          <Text style={styles.rentUnit}> /tháng</Text>
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.blockLabel}>Người thuê</Text>
        {tenant ? (
          <View style={styles.block}>
            <View style={styles.iconRow}>
              <User size={16} color={colors.mutedForeground} />
              <Text style={styles.blockTitle}>{tenant.full_name}</Text>
            </View>
            {tenant.phone ? <Muted size={12}>SĐT: {tenant.phone}</Muted> : null}
            {tenant.email ? <Muted size={12}>Email: {tenant.email}</Muted> : null}
            {tenant.id_number ? <Muted size={12}>CCCD: {tenant.id_number}</Muted> : null}
            {tenant.move_in_date ? (
              <Muted size={12}>Ngày vào: {formatDate(tenant.move_in_date)}</Muted>
            ) : null}
            {lease ? <Muted size={12}>Bắt đầu HĐ: {formatDate(lease.start_date)}</Muted> : null}
            {lease?.deposit ? <Muted size={12}>Tiền cọc: {formatVND(lease.deposit)}</Muted> : null}
            {tenant.notes ? (
              <>
                <Divider style={{ marginVertical: 4 }} />
                <Muted size={12}>{tenant.notes}</Muted>
              </>
            ) : null}
          </View>
        ) : (
          <View style={styles.note}>
            <Muted size={13}>Chưa gán người thuê cho phòng này.</Muted>
          </View>
        )}
      </View>

      <View style={styles.periodCard}>
        <View style={styles.periodHead}>
          <View style={styles.iconRow}>
            <Gauge size={16} color={colors.mutedForeground} />
            <Title>Kỳ hiện tại</Title>
            <Muted size={12}>· {period}</Muted>
          </View>
        </View>

        <View style={styles.flagRow}>
          {cm ? (
            <Badge
              label="Đã ghi"
              bg={colors.emerald.bg}
              fg={colors.emerald.fg}
              border={colors.emerald.border}
              icon={<CheckCircle2 size={10} color={colors.emerald.fg} />}
            />
          ) : (
            <Badge
              label="Chưa ghi"
              bg={colors.amber.bg}
              fg={colors.amber.fg}
              border={colors.amber.border}
              icon={<AlertCircle size={10} color={colors.amber.fg} />}
            />
          )}
          {row.currentInvoice ? (
            <Badge
              label="Có HĐ"
              bg={colors.blue.bg}
              fg={colors.blue.fg}
              border={colors.blue.border}
              icon={<Receipt size={10} color={colors.blue.fg} />}
            />
          ) : null}
        </View>

        {cm ? (
          <View style={styles.pair}>
            <View style={styles.usageBox}>
              <View style={styles.iconRow}>
                <Zap size={12} color={colors.power} />
                <Text style={styles.usageLabel}>Điện</Text>
              </View>
              <Muted size={11}>
                {cm.electricity_start} → {cm.electricity_end}
              </Muted>
              <Text style={styles.usageValue}>
                {kwhUsed} kWh · {formatVND(eAmt)}
              </Text>
            </View>
            <View style={styles.usageBox}>
              <View style={styles.iconRow}>
                <Droplet size={12} color={colors.water} />
                <Text style={styles.usageLabel}>Nước</Text>
              </View>
              <Muted size={11}>
                {cm.water_start} → {cm.water_end}
              </Muted>
              <Text style={styles.usageValue}>
                {m3Used} m³ · {formatVND(wAmt)}
              </Text>
            </View>
          </View>
        ) : (
          <Muted size={12}>
            {pm
              ? `Chỉ số cuối kỳ trước: điện ${pm.electricity_end}, nước ${pm.water_end}. Ghi chỉ số mới để tự động tính hoá đơn.`
              : "Chưa có chỉ số nào. Ghi chỉ số đầu/cuối kỳ để tự động tính hoá đơn."}
          </Muted>
        )}

        {showMeter ? (
          <View style={styles.meterForm}>
            <View style={styles.iconRow}>
              <Zap size={14} color={colors.power} />
              <Text style={styles.usageLabel}>Điện (kWh)</Text>
            </View>
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Chỉ số đầu">
                  <TextInput value={eStart} onChangeText={setEStart} keyboardType="number-pad" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Chỉ số cuối">
                  <TextInput value={eEnd} onChangeText={setEEnd} keyboardType="number-pad" />
                </Field>
              </View>
            </View>

            <View style={styles.iconRow}>
              <Droplet size={14} color={colors.water} />
              <Text style={styles.usageLabel}>Nước (m³)</Text>
            </View>
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Chỉ số đầu">
                  <TextInput value={wStart} onChangeText={setWStart} keyboardType="number-pad" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Chỉ số cuối">
                  <TextInput value={wEnd} onChangeText={setWEnd} keyboardType="number-pad" />
                </Field>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <SecondaryButton
                label="Huỷ"
                onPress={() => setShowMeter(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={busy ? "Đang lưu…" : "Lưu chỉ số"}
                disabled={busy}
                onPress={() => void saveMeter()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SecondaryButton
              label={cm ? "Cập nhật chỉ số" : "Ghi chỉ số"}
              icon={<Gauge size={16} color={colors.foreground} />}
              onPress={() => setShowMeter(true)}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={row.currentInvoice ? "Đã có HĐ" : "Tạo hoá đơn"}
              icon={<Receipt size={16} color={colors.primaryForeground} />}
              disabled={!cm || !!row.currentInvoice || busy}
              onPress={() => void createInvoiceForPeriod()}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>

      <View style={styles.pair}>
        <View style={styles.usageBox}>
          <View style={styles.iconRow}>
            <Zap size={12} color={colors.mutedForeground} />
            <Text style={styles.usageLabel}>Giá điện</Text>
          </View>
          <Text style={styles.usageValue}>{formatVND(row.electricity_rate)}/kWh</Text>
        </View>
        <View style={styles.usageBox}>
          <View style={styles.iconRow}>
            <Droplet size={12} color={colors.mutedForeground} />
            <Text style={styles.usageLabel}>Giá nước</Text>
          </View>
          <Text style={styles.usageValue}>{formatVND(row.water_rate)}/m³</Text>
        </View>
      </View>

      {row.description ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.blockLabel}>Ghi chú nội bộ</Text>
          <View style={styles.block}>
            <Muted size={13}>{row.description}</Muted>
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={styles.blockLabel}>Hoá đơn gần đây</Text>
        {invoices.length === 0 ? (
          <View style={styles.note}>
            <Muted size={13}>Chưa có hoá đơn nào.</Muted>
          </View>
        ) : (
          <View style={styles.block}>
            {invoices.map((inv, i) => (
              <View key={inv.id} style={[styles.invoiceRow, i > 0 && styles.invoiceDivided]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.blockTitle}>Kỳ {inv.period}</Text>
                  <Muted size={11}>
                    {inv.status === "paid" ? "Đã thanh toán" : "Chưa thu"}
                    {inv.due_date ? ` · Hạn ${formatDate(inv.due_date)}` : ""}
                  </Muted>
                </View>
                <Text
                  style={[styles.blockTitle, inv.status !== "paid" && { color: colors.destructive }]}
                >
                  {formatVND(inv.total_amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {row.area || row.address ? (
        <View style={{ gap: 4 }}>
          {row.area ? <Muted size={12}>Khu vực: {row.area}</Muted> : null}
          {row.address ? <Muted size={12}>Địa chỉ: {row.address}</Muted> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  verifyLabel: { fontFamily: font.semibold, fontSize: 13 },

  searchWrap: { justifyContent: "center", marginBottom: 12 },
  searchIcon: { position: "absolute", left: 16, zIndex: 1 },

  filterStrip: { gap: 8, paddingBottom: 16 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  filterLabel: { fontFamily: font.medium, fontSize: 12, color: colors.mutedForeground },
  filterLabelActive: { color: colors.primaryForeground },
  filterCount: {
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.tint100,
  },
  filterCountActive: { backgroundColor: colors.onAccentFill },
  filterCountText: { fontFamily: font.medium, fontSize: 10, color: colors.mutedForeground },

  flagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  rent: { fontFamily: font.extrabold, fontSize: 17, color: colors.primary },
  rentUnit: { fontFamily: font.regular, fontSize: 10, color: colors.mutedForeground },
  debt: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 11,
    color: colors.destructive,
  },

  pair: { flexDirection: "row", gap: 12 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusOption: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  statusOptionLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
  },

  note: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: 14,
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
  },
  disclosureLabel: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  disclosureHint: {
    fontFamily: font.regular,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  toggle: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  toggleOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleLabel: { fontFamily: font.medium, fontSize: 13, color: colors.mutedForeground },

  moderationBox: {
    gap: 4,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: 4,
  },
  moderationTitle: { fontFamily: font.semibold, fontSize: 13 },
  moderationNote: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, opacity: 0.9 },
  moderationReason: { fontFamily: font.medium, fontSize: 12, lineHeight: 18, marginTop: 4 },

  detailHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  blockLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  block: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 14,
    gap: 4,
  },
  blockTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  periodCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius["2xl"],
    padding: 14,
    gap: 12,
  },
  periodHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  usageBox: {
    flex: 1,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
  },
  usageLabel: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  usageValue: { fontFamily: font.semibold, fontSize: 13, color: colors.foreground },
  meterForm: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: 12,
    gap: 12,
  },

  invoiceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  invoiceDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
