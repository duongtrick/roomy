import { useEffect, useState } from "react";
import { db } from "@/lib/mock-db";
import { toast } from "sonner";
import { Plus, Users, Trash2, Edit3, Phone, Mail } from "lucide-react";
import type { Tenant } from "@/lib/dashboard-types";
import { EmptyState, Field, Modal, PrimaryButton, SecondaryButton, TextArea, TextInput } from "./ui";

export function TenantsTab({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<Tenant[]>([]);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setItems(db.getTenants());
  };

  useEffect(() => { load(); }, [ownerId]);

  const handleDelete = (id: string) => {
    if (!confirm("Xoá người thuê này?")) return;
    db.deleteTenant(id);
    toast.success("Đã xoá");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif italic font-bold">Người thuê</h2>
          <p className="text-sm text-muted-foreground mt-1">Tổng {items.length} người</p>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="size-4" /> Thêm người thuê
        </PrimaryButton>
      </div>

      {showForm && (
        <TenantForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Chưa có người thuê nào"
          description="Thêm thông tin người thuê để theo dõi và liên hệ dễ dàng."
          action={
            <PrimaryButton onClick={() => { setEditing(null); setShowForm(true); }}>
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
                  {t.id_number && <p className="text-xs text-muted-foreground mt-0.5">CCCD: {t.id_number}</p>}
                </div>
                <div className="flex">
                  <button onClick={() => { setEditing(t); setShowForm(true); }} className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-foreground/5 cursor-pointer">
                    <Edit3 className="size-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-destructive/10 cursor-pointer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {t.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" /> {t.phone}</p>}
                {t.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="size-3.5" /> {t.email}</p>}
                {t.move_in_date && <p className="text-xs text-muted-foreground">Chuyển vào: {t.move_in_date}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TenantForm({ initial, onClose, onSaved }: { initial: Tenant | null; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [idNumber, setIdNumber] = useState(initial?.id_number ?? "");
  const [moveInDate, setMoveInDate] = useState(initial?.move_in_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveTenant({
      id: initial?.id,
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      id_number: idNumber || null,
      move_in_date: moveInDate || null,
      notes: notes || null,
    });
    toast.success(initial ? "Đã cập nhật" : "Đã thêm người thuê");
    onSaved();
  };

  return (
    <Modal title={initial ? "Chỉnh sửa người thuê" : "Thêm người thuê"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Họ tên">
          <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số điện thoại"><TextInput value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email"><TextInput type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CCCD / CMND"><TextInput value={idNumber ?? ""} onChange={(e) => setIdNumber(e.target.value)} /></Field>
          <Field label="Ngày chuyển vào"><TextInput type="date" value={moveInDate ?? ""} onChange={(e) => setMoveInDate(e.target.value)} /></Field>
        </div>
        <Field label="Ghi chú"><TextArea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={3} /></Field>
        <div className="flex gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose} className="flex-1">Huỷ</SecondaryButton>
          <PrimaryButton type="submit" className="flex-1">Lưu</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
