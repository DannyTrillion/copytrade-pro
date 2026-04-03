"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Heart,
} from "lucide-react";

/* ────────────────────────────── Types ────────────────────────────── */

interface NextOfKinRecord {
  id: string;
  userId: string;
  fullName: string;
  relationship: string;
  email: string;
  phone: string | null;
  beneficiaryId: string | null;
  documentUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type FormMessage = { type: "success" | "error"; text: string } | null;

const RELATIONSHIP_OPTIONS = ["Spouse", "Parent", "Child", "Sibling", "Other"] as const;

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    label: "Pending Review",
    description: "Your next of kin designation is awaiting admin review.",
    bgClass: "bg-warning/10 border-warning/20",
    textClass: "text-warning",
  },
  APPROVED: {
    icon: CheckCircle2,
    label: "Approved",
    description: "Your next of kin designation has been approved.",
    bgClass: "bg-success/10 border-success/20",
    textClass: "text-success",
  },
  REJECTED: {
    icon: XCircle,
    label: "Rejected",
    description: "Your next of kin designation was rejected.",
    bgClass: "bg-danger/10 border-danger/20",
    textClass: "text-danger",
  },
} as const;

/* ────────────────────────────── Component ────────────────────────────── */

export default function NextOfKinPage() {
  /* ── Data state ── */
  const [record, setRecord] = useState<NextOfKinRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FormMessage>(null);

  /* ── Form state ── */
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  /* ── Validation state ── */
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch existing record ── */
  const fetchRecord = useCallback(async () => {
    try {
      const res = await fetch("/api/next-of-kin");
      if (res.ok) {
        const data = await res.json();
        const nok: NextOfKinRecord | null = data.nextOfKin;
        setRecord(nok);
        if (nok) {
          setFullName(nok.fullName);
          setRelationship(nok.relationship);
          setEmail(nok.email);
          setPhone(nok.phone ?? "");
          setDocumentUrl(nok.documentUrl ?? "");
          // beneficiaryEmail is not stored — user re-enters if needed
          setBeneficiaryEmail("");
        }
      }
    } catch {
      // Silent fail — skeleton will show until data loads
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  /* ── File upload ── */
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "File upload failed" });
        return;
      }

      const data = await res.json();
      setDocumentUrl(data.url);
      setMessage({ type: "success", text: "Document uploaded successfully" });
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Mark all required fields as touched
    setTouched({ fullName: true, relationship: true, email: true });

    if (!fullName.trim() || !relationship || !email.trim()) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/next-of-kin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          relationship,
          email: email.trim(),
          phone: phone.trim() || undefined,
          beneficiaryId: beneficiaryEmail.trim() || undefined,
          documentUrl: documentUrl || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRecord(data.nextOfKin);
        setMessage({ type: "success", text: "Next of kin saved successfully. Pending admin review." });
        setTouched({});
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  /* ── Validation helpers ── */
  const isFieldInvalid = (field: string, value: string) => touched[field] && !value.trim();

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  const statusConfig = record ? STATUS_CONFIG[record.status] : null;

  return (
    <div className="dashboard-section">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-brand/10">
            <Shield className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Next of Kin</h2>
            <p className="text-sm text-text-tertiary">
              Designate a beneficiary for your account
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Status Banner ── */}
      {record && statusConfig && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`mt-5 flex items-start gap-3 px-4 py-3.5 rounded-xl border ${statusConfig.bgClass}`}
        >
          <statusConfig.icon className={`w-5 h-5 mt-0.5 shrink-0 ${statusConfig.textClass}`} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${statusConfig.textClass}`}>
              {statusConfig.label}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {statusConfig.description}
            </p>
            {record.status === "REJECTED" && record.adminNote && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-danger/5 border border-danger/10">
                <p className="text-xs text-text-secondary">
                  <span className="font-medium text-danger">Admin note:</span>{" "}
                  {record.adminNote}
                </p>
              </div>
            )}
            {record.reviewedAt && (
              <p className="text-2xs text-text-tertiary mt-1.5">
                Reviewed on{" "}
                {new Date(record.reviewedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Form ── */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 space-y-6"
      >
        {/* Personal Details Panel */}
        <div className="glass-panel p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-brand/10">
              <Users className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Beneficiary Details
              </h3>
              <p className="text-2xs text-text-tertiary">
                Personal information of your designated next of kin
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Full Name <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                  className={`input-field pl-10 ${isFieldInvalid("fullName", fullName) ? "border-danger/50 focus:border-danger" : ""}`}
                  placeholder="Enter full legal name"
                  maxLength={100}
                />
              </div>
              {isFieldInvalid("fullName", fullName) && (
                <p className="text-2xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Full name is required
                </p>
              )}
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Relationship <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, relationship: true }))}
                  className={`input-field pl-10 appearance-none ${isFieldInvalid("relationship", relationship) ? "border-danger/50 focus:border-danger" : ""}`}
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>
              {isFieldInvalid("relationship", relationship) && (
                <p className="text-2xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Relationship is required
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Email Address <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  className={`input-field pl-10 ${isFieldInvalid("email", email) ? "border-danger/50 focus:border-danger" : ""}`}
                  placeholder="beneficiary@email.com"
                />
              </div>
              {isFieldInvalid("email", email) && (
                <p className="text-2xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Email is required
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Phone Number{" "}
                <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-10"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Platform Beneficiary Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel p-5 md:p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-info/10">
              <Users className="w-4 h-4 text-info" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Platform Beneficiary
              </h3>
              <p className="text-2xs text-text-tertiary">
                Optionally link to another platform user
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Beneficiary Email{" "}
              <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="email"
                value={beneficiaryEmail}
                onChange={(e) => setBeneficiaryEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="user@platform.com"
              />
            </div>
            <p className="text-2xs text-text-tertiary mt-1.5">
              Enter the email of another platform user to designate as beneficiary.
              This links their account to receive your funds.
            </p>
          </div>
        </motion.div>

        {/* Document Upload Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel p-5 md:p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-warning/10">
              <FileText className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Verification Document
              </h3>
              <p className="text-2xs text-text-tertiary">
                Upload a supporting document (ID, legal form, etc.)
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onFileChange}
            className="hidden"
          />

          {documentUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary/50 border border-border">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  Document uploaded
                </p>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xs text-brand hover:underline truncate block"
                >
                  View document
                </a>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Replace"
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-brand/40 transition-colors cursor-pointer group"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
              ) : (
                <Upload className="w-6 h-6 text-text-tertiary group-hover:text-brand transition-colors" />
              )}
              <div className="text-center">
                <p className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {uploading ? "Uploading..." : "Click to upload document"}
                </p>
                <p className="text-2xs text-text-tertiary mt-0.5">
                  JPEG, PNG, WebP, or PDF up to 5MB
                </p>
              </div>
            </button>
          )}
        </motion.div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 text-xs px-4 py-3 rounded-xl ${
              message.type === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between gap-4"
        >
          <p className="text-2xs text-text-tertiary">
            {record
              ? `Last updated ${new Date(record.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : "Your submission will be reviewed by an administrator"}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm px-6 min-w-[140px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : record ? (
              "Update & Resubmit"
            ) : (
              "Submit for Review"
            )}
          </button>
        </motion.div>
      </motion.form>
    </div>
  );
}
