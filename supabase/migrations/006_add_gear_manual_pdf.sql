-- Add manual_pdf_url column for uploaded PDF manuals (hybrid: external link + uploaded PDF)
ALTER TABLE gear ADD COLUMN manual_pdf_url TEXT;
