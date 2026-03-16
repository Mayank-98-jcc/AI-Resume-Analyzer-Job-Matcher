import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Eye, X } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import API from "../services/api";
import AdminLayout from "../components/AdminLayout";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function getApiErrorMessage(fetchError) {
  const fallback =
    fetchError?.response?.status === 404
      ? "Resume file not found. If this resume was uploaded before file storage was enabled, please re-upload it."
      : "Unable to load resume preview.";

  const data = fetchError?.response?.data;
  if (!data) return fallback;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json?.message || json?.error || fallback;
    } catch {
      return fallback;
    }
  }

  return data?.message || data?.error || fallback;
}

function AdminResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [selectedResume, setSelectedResume] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileBlob, setFileBlob] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/admin/resumes");
        setResumes(Array.isArray(res.data) ? res.data : []);
      } catch (fetchError) {
        console.error("Admin resumes fetch error:", fetchError);
        setError(fetchError?.response?.data?.message || "Unable to load resumes right now.");
        setResumes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [resumes.length]);

  const totalPages = Math.max(1, Math.ceil(resumes.length / perPage));

  const pagedResumes = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    return resumes.slice(startIndex, startIndex + perPage);
  }, [page, resumes]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  useEffect(() => {
    if (!previewOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const openPreview = async (resume) => {
    if (!resume?._id) return;
    setSelectedResume(resume);
    setPreviewOpen(true);
    setFileError("");
    setNumPages(0);
    setPageNumber(1);

    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl("");
    setFileBlob(null);

    try {
      setFileLoading(true);
      const res = await API.get(`/admin/resumes/${resume._id}/file`, { responseType: "blob" });
      const rawBlob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const fileName = String(resume.fileName || "").toLowerCase();
      const looksLikePdf = fileName.endsWith(".pdf");
      const contentType = String(rawBlob.type || "").toLowerCase();
      const isPdf = contentType.includes("pdf") || (looksLikePdf && (contentType === "" || contentType.includes("octet-stream")));

      const normalizedBlob = isPdf && !contentType.includes("pdf") ? new Blob([rawBlob], { type: "application/pdf" }) : rawBlob;
      setFileBlob(normalizedBlob);

      if (!isPdf) {
        setFileError("Preview is available for PDF resumes only. Use Download for this file.");
        return;
      }

      const url = URL.createObjectURL(normalizedBlob);
      setFileUrl(url);
    } catch (fetchError) {
      console.error("Resume file fetch error:", fetchError);
      setFileError(await getApiErrorMessage(fetchError));
    } finally {
      setFileLoading(false);
    }
  };

  const downloadSelected = () => {
    if (!fileBlob) return;
    const name = selectedResume?.fileName || "resume";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(fileBlob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <AdminLayout
      title="Resumes"
      subtitle="Review every uploaded resume, ATS score, and extracted skills."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">All Resumes</p>
            <p className="text-sm text-slate-300">
              {loading ? "Loading..." : `${resumes.length} resume${resumes.length === 1 ? "" : "s"} total`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!canPrev}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!canNext}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-6 pt-5 text-sm text-rose-200">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/30 text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Resume File</th>
                <th className="px-6 py-4 font-medium">ATS Score</th>
                <th className="px-6 py-4 font-medium">Skills</th>
              </tr>
            </thead>
            <tbody>
              {pagedResumes.map((resume) => (
                <tr key={resume._id} className="border-t border-white/5 align-top">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-100">{resume.userName || "-"}</p>
                    <p className="mt-1 text-xs text-slate-400">{resume.userEmail || "-"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-300">{resume.fileName || "-"}</p>
                    <button
                      type="button"
                      onClick={() => openPreview(resume)}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye size={14} />
                      View Resume
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                      {resume.atsScore ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {(resume.skills || []).length ? resume.skills.join(", ") : "-"}
                  </td>
                </tr>
              ))}

              {!loading && resumes.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400">
                    No resumes uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {previewOpen ? (
          <Motion.div
            key="resume-preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Resume preview"
          >
            <Motion.button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute inset-0 bg-slate-950/70"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <Motion.div
              ref={modalRef}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/80 shadow-[0_40px_140px_rgba(2,6,23,0.85)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Candidate</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {selectedResume?.userName || "Unknown"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{selectedResume?.fileName || ""}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadSelected}
                    disabled={!fileBlob}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-[75vh] overflow-auto px-6 py-6 sm:px-8">
                {fileLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                    Loading resume preview…
                  </div>
                ) : fileError ? (
                  <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-100">
                    {fileError}
                  </div>
                ) : fileUrl ? (
                  <div className="mx-auto w-full max-w-3xl">
                    <Document
                      file={fileUrl}
                      onLoadSuccess={({ numPages: nextPages }) => {
                        setNumPages(nextPages || 0);
                        setPageNumber(1);
                      }}
                      loading={
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                          Loading PDF…
                        </div>
                      }
                      error={
                        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-100">
                          Unable to render this PDF.
                        </div>
                      }
                    >
                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4">
                        <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
                      </div>
                    </Document>

                    {numPages > 1 ? (
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                          disabled={pageNumber <= 1}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Prev page
                        </button>
                        <p className="text-sm text-slate-300">
                          Page <span className="font-semibold text-white">{pageNumber}</span> / {numPages}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
                          disabled={pageNumber >= numPages}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next page
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                    Select a resume to preview.
                  </div>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </AdminLayout>
  );
}

export default AdminResumes;
