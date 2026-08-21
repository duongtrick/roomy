import { useState } from "react";
import { getTenants, insertTenant, updateTenant, deleteTenant } from "@/lib/api/tenants.api";
import { toast } from "sonner";
import { Plus, Users, Trash2, Edit3, Phone, Mail } from "lucide-react";
import type { Tenant } from "@/lib/dashboard-types";
import { useOwnerData } from "@/hooks/use-owner-data";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import {
  EmptyState,
  Field,
  IconButton,
  Modal,
  PrimaryButton,
  SecondaryButton,
  TabHeader,
  TextArea,
  TextInput,
} from "./ui";

const EMPTY: Tenant[] = [];

const fetchTenants = (ownerId: string) => getTenants({ data: { ownerId } });

export function TenantsTab({ ownerId }: { ownerId: string }) {
  const { data: items, loading, reload } = useOwnerData(ownerId, fetchTenants, EMPTY);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [showForm, setShowForm] = useState(false);

  const openForm = (tenant: Tenant | null) => {
    setEditing(tenant);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá người thuê này?")) return;
    try {
      const res = await deleteTenant({ data: { id, owner_id: ownerId } });
      if (!res.ok) throw new Error("Không tìm thấy người thuê");
      toast.success("Đã xoá");
      void reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <TabHeader
        title="Người thuê"
        subtitle={`Tổng ${items.length} người`}
        action={
          <PrimaryButton onClick={() => openForm(null)} aria-label="Thêm người thuê">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Thêm người thuê</span>
          </PrimaryButton>
        }
      />

      {showForm && (
        <TenantForm
          // Keyed so switching which tenant is edited re-seeds the form state.
          key={editing?.id ?? "new"}
          ownerId={ownerId}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void reload();
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Chưa có người thuê nào"
          description="Thêm thông tin người thuê để theo dõi và liên hệ dễ dàng."
          action={
            <PrimaryButton onClick={() => openForm(null)}>
              <Plus className="size-4" /> Thêm người thuê
            </PrimaryButton>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <article key={t.id} className="border border-border rounded-2xl p-5 bg-background">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium">{t.full_name}</h3>
                  {t.id_number && (
                    <p className="text-xs text-muted-foreground mt-0.5">CCCD: {t.id_number}</p>
                  )}
                </div>
                <div className="flex">
                  <IconButton onClick={() => openForm(t)} aria-label={`Sửa ${t.full_name}`}>
                    <Edit3 className="size-4" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(t.id)}
                    aria-label={`Xoá ${t.full_name}`}
                    className="hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {t.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5" /> {t.phone}
                  </p>
                )}
                {t.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5" /> {t.email}
                  </p>
                )}
                {t.move_in_date && (
                  <p className="text-xs text-muted-foreground">
                    Chuyển vào: {formatDate(t.move_in_date)}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TenantForm({
  ownerId,
  initial,
  onClose,
  onSaved,
}: {
  ownerId: string;
  initial: Tenant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [idNumber, setIdNumber] = useState(initial?.id_number ?? "");
  const [moveInDate, setMoveInDate] = useState(initial?.move_in_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: ownerId,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        id_number: idNumber.trim() || null,
        move_in_date: moveInDate || null,
        notes: notes.trim() || null,
      };
      if (initial) {
        const res = await updateTenant({ data: { ...payload, id: initial.id } });
        if (!res.ok) throw new Error("Không tìm thấy người thuê");
      } else {
        await insertTenant({ data: payload });
      }
      toast.success(initial ? "Đã cập nhật" : "Đã thêm người thuê");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? "Chỉnh sửa người thuê" : "Thêm người thuê"}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1">
            Huỷ
          </SecondaryButton>
          <PrimaryButton type="submit" form="tenant-form" disabled={busy} className="flex-1">
            {busy ? "Đang lưu..." : "Lưu"}
          </PrimaryButton>
        </div>
      }
    >
      <form id="tenant-form" onSubmit={submit} className="space-y-4">
        <Field label="Họ tên">
          <TextInput
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Số điện thoại">
            <TextInput
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CCCD / CMND">
            <TextInput value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </Field>
          <Field label="Ngày chuyển vào">
            <TextInput
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Ghi chú">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
      </form>
    </Modal>
  );
}
