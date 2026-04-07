from Model.Report import Report
from services.fake_data_service import generate_fake_values

# ==============================
# CREATE REPORT
# ==============================
def generate_report(db):
    # كنجيبو data عشوائية
    total_locations, total_revenue, average_price = generate_fake_values()

    # كننشئو report (خاص الأسماء يطابقو model)
    report = Report(
        total_locations=total_locations,
        revenue_total=total_revenue,   # ✔ نفس الاسم ف model
        prix_moyen=average_price       # ✔ نفس الاسم ف model
    )

    # كنحفظو ف DB
    db.add(report)
    db.commit()
    db.refresh(report)

    return report


# GET ALL REPORTS
# ==============================
def get_reports(db):
    return db.query(Report).all()


# ==============================
# DASHBOARD (آخر report)
# ==============================
def get_dashboard(db):
    report = db.query(Report).order_by(Report.id.desc()).first()

    if not report:
        return {"message": "No data"}

    return {
        "total_locations": report.total_locations,
        "total_revenue": report.revenue_total,  # ✔
        "average_price": report.prix_moyen      # ✔
    }


def get_stats(db):
    reports = db.query(Report).all()

    if not reports:
        return {"message": "No data"}

    total_reports = len(reports)
    total_revenue = sum(r.revenue_total for r in reports)
    average_price = sum(r.prix_moyen for r in reports) / total_reports

    return {
        "total_reports": total_reports,
        "total_revenue": total_revenue,
        "average_price": average_price
    }


def get_reports_filtered(db, start_date=None):
    query = db.query(Report)

    if start_date:
        query = query.filter(Report.date_creation >= start_date)

    return query.all()