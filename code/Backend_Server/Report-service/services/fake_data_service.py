import random

# function كتولد data عشوائية
def generate_fake_values():
    total_locations = random.randint(20, 100)  # عدد الكراءات
    total_revenue = random.randint(10000, 50000)  # المداخيل
    average_price = total_revenue / total_locations  # متوسط الثمن

    return total_locations, total_revenue, average_price
