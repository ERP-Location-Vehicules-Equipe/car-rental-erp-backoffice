from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from fastapi.responses import FileResponse

# ==============================
# GENERATE PDF REPORT
# ==============================
def generate_pdf():
    file_path = "report.pdf"  # اسم الملف

    # إنشاء document
    doc = SimpleDocTemplate(file_path)

    # styles ديال النص
    styles = getSampleStyleSheet()

    elements = []

    # محتوى PDF
    elements.append(Paragraph("ERP Report Service", styles["Title"]))
    elements.append(Paragraph("Generated Report", styles["Normal"]))

    # build PDF
    doc.build(elements)

    # رجع الملف باش يتحمل
    return FileResponse(
        path=file_path,
        media_type='application/pdf',
        filename="report.pdf"
    )