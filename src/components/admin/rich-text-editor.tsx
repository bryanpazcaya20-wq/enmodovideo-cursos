"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { uploadImage } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

/** Editor del "Paso a paso": texto con formato, pasos numerados e imágenes. Devuelve HTML. */
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["https"], defaultProtocol: "https" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Escribe los pasos… Usa la lista numerada (1.) para cada paso." }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "rich min-h-56 px-4 py-4 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            ol: e.isActive("orderedList"),
            ul: e.isActive("bulletList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  async function addImage(file: File | undefined) {
    if (!file || !editor) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      if (uploaded.publicUrl) editor.chain().focus().setImage({ src: uploaded.publicUrl, alt: "" }).run();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) return void editor.chain().focus().unsetLink().run();
    const url = window.prompt("Pega el enlace (https://…)");
    if (url && /^https:\/\//i.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />;
  const c = () => editor.chain().focus();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 focus-within:border-violet">
      <div className="sticky top-0 z-10 flex flex-wrap gap-0.5 border-b border-border bg-surface p-1.5">
        <Tool label="Paso numerado" active={state?.ol} onClick={() => c().toggleOrderedList().run()}>
          <ListOrdered />
        </Tool>
        <Tool label="Viñetas" active={state?.ul} onClick={() => c().toggleBulletList().run()}>
          <List />
        </Tool>
        <Sep />
        <Tool label="Negrita" active={state?.bold} onClick={() => c().toggleBold().run()}>
          <Bold />
        </Tool>
        <Tool label="Cursiva" active={state?.italic} onClick={() => c().toggleItalic().run()}>
          <Italic />
        </Tool>
        <Tool label="Subrayado" active={state?.underline} onClick={() => c().toggleUnderline().run()}>
          <Underline />
        </Tool>
        <Sep />
        <Tool label="Título" active={state?.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
          <Heading2 />
        </Tool>
        <Tool label="Subtítulo" active={state?.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
          <Heading3 />
        </Tool>
        <Tool label="Consejo / cita" active={state?.quote} onClick={() => c().toggleBlockquote().run()}>
          <Quote />
        </Tool>
        <Tool label="Enlace" active={state?.link} onClick={toggleLink}>
          <Link2 />
        </Tool>
        <Tool label="Imagen" onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        </Tool>
        <Sep />
        <Tool label="Deshacer" onClick={() => c().undo().run()}>
          <Undo2 />
        </Tool>
        <Tool label="Rehacer" onClick={() => c().redo().run()}>
          <Redo2 />
        </Tool>
      </div>
      <EditorContent editor={editor} />
      {error && <p className="px-4 pb-3 text-sm text-danger">{error}</p>}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => addImage(e.target.files?.[0])} />
    </div>
  );
}

function Tool({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-10 place-items-center rounded-lg text-muted transition-colors [&_svg]:size-[18px] hover:bg-surface-2 hover:text-text disabled:opacity-50",
        active && "bg-violet-soft text-violet",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 my-2 w-px bg-border" aria-hidden />;
}
