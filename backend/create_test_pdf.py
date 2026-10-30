import pymupdf


def create_pump_p102_pdf(output_path: str):
    doc = pymupdf.open()

    page = doc.new_page()
    page.insert_text((72, 72), "Pump P-102 — Maintenance Manual", fontsize=18, fontname="helv")
    page.insert_text((72, 100), "Industrial Centrifugal Pump — KSB Etanorm Series", fontsize=12, fontname="helv")
    page.insert_text((72, 125), "Document Version: v3.2 | Classification: Internal Use Only", fontsize=9, fontname="helv")
    page.insert_text((72, 140), "All data in this document is synthetic and fictional for testing purposes.", fontsize=9, fontname="helv")

    page.insert_text((72, 175), "1. Equipment Overview", fontsize=14, fontname="helv")
    overview = (
        "Pump P-102 is a horizontal single-stage centrifugal pump manufactured by KSB, "
        "model Etanorm 50-250. It is installed in Unit 3 of the process plant and is used "
        "for circulating cooling water in the secondary cooling loop. The pump was commissioned "
        "on 2022-03-15 and has been in continuous service since. Rated flow is 50 m3/h at a "
        "total dynamic head of 32 meters. Motor rating is 7.5 kW, 3-phase, 50 Hz. "
        "The pump operates at 2950 RPM."
    )
    page.insert_text((72, 195), overview, fontsize=10, fontname="helv")

    page.insert_text((72, 280), "2. Preventive Maintenance Schedule", fontsize=14, fontname="helv")
    schedule = (
        "The recommended maintenance interval for Pump P-102 is as follows:\n"
        "  - Weekly: Visual inspection of pump and motor. Check for abnormal vibration, "
        "unusual noise, and seal leakage. Record bearing housing temperature.\n"
        "  - Monthly: Lube oil sampling and top-up. Check coupling alignment. "
        "Verify pressure relief valve setting (setpoint: 6.0 bar).\n"
        "  - Quarterly: Full vibration analysis per ISO 10816-7. Measure impeller wear ring "
        "clearance. Inspect mechanical seal. If leakage exceeds 3 ml/hr, replace seal.\n"
        "  - Annually: Complete overhaul. Replace bearings, mechanical seal, and wear rings. "
        "Check impeller for cavitation damage. Re-align motor to pump."
    )
    page.insert_text((72, 300), schedule, fontsize=10, fontname="helv")

    page2 = doc.new_page()
    page2.insert_text((72, 72), "3. Vibration Limits and Monitoring", fontsize=14, fontname="helv")
    vibration = (
        "Pump P-102 vibration limits are defined per ISO 10816-7 for Group 2 machines:\n"
        "  - Good: 0.0 to 2.8 mm/s RMS\n"
        "  - Acceptable: 2.8 to 4.5 mm/s RMS\n"
        "  - Alert: 4.5 to 7.1 mm/s RMS\n"
        "  - Alarm/Trip: > 7.1 mm/s RMS\n\n"
        "Vibration readings shall be taken monthly using a portable analyzer. "
        "The baseline vibration signature was recorded during commissioning on 2022-03-15 "
        "with overall velocity of 1.8 mm/s RMS. Any deviation exceeding 25% from baseline "
        "shall trigger a detailed diagnostic investigation."
    )
    page2.insert_text((72, 95), vibration, fontsize=10, fontname="helv")

    page2.insert_text((72, 230), "4. Seal Replacement Procedure", fontsize=14, fontname="helv")
    seal_proc = (
        "The mechanical seal on Pump P-102 is a John Crane Type 2800 single cartridge seal. "
        "Replacement procedure:\n"
        "  1. Isolate pump and lock out/tag out per LOTO procedure SOP-HSE-015.\n"
        "  2. Drain pump casing through bottom drain valve.\n"
        "  3. Remove coupling guard and disconnect coupling.\n"
        "  4. Disconnect seal flush lines (Plan 11 and Plan 32).\n"
        "  5. Remove gland bolts and slide gland plate forward.\n"
        "  6. Pull impeller using KSB extraction tool ET-200.\n"
        "  7. Remove old seal and inspect shaft sleeve for scoring.\n"
        "  8. Install new seal cartridge per John Crane installation sheet.\n"
        "  9. Reassemble pump and reconnect flush lines.\n"
        " 10. Perform hydrostatic test at 1.5x design pressure (9.0 bar) for 30 minutes.\n"
        "Estimated downtime for seal replacement: 6 hours."
    )
    page2.insert_text((72, 250), seal_proc, fontsize=10, fontname="helv")

    page3 = doc.new_page()
    page3.insert_text((72, 72), "5. Lubrication Schedule", fontsize=14, fontname="helv")
    lube = (
        "Bearing lubrication for Pump P-102:\n"
        "  - Front bearing: Oil bath lubrication using ISO VG 68 mineral oil.\n"
        "  - Rear bearing: Oil bath lubrication using ISO VG 68 mineral oil.\n"
        "  - Oil change interval: Every 4,000 operating hours or 6 months, whichever is sooner.\n"
        "  - Oil level: Maintain between MIN and MAX marks on sight glass.\n"
        "  - Oil sampling: Take samples at each quarterly maintenance interval.\n"
        "  - Acceptable oil condition: Clean, clear, no metallic particles, acid number < 0.5 mg KOH/g.\n"
        "  - Grease points: coupling guard hinge pins — lithium complex NLGI 2, every 6 months."
    )
    page3.insert_text((72, 95), lube, fontsize=10, fontname="helv")

    page3.insert_text((72, 220), "6. Safety Precautions", fontsize=14, fontname="helv")
    safety = (
        "All maintenance on Pump P-102 must comply with plant safety regulations:\n"
        "  - Lock Out / Tag Out (LOTO) procedure SOP-HSE-015 is mandatory.\n"
        "  - Confined space entry requires gas testing and permit per SOP-HSE-008.\n"
        "  - PPE required: safety glasses, steel-toe boots, hearing protection (above 85 dBA).\n"
        "  - Hot work permit required if welding or grinding near the pump.\n"
        "  - Chemical handling: Seal flush fluids may contain chemicals — consult SDS before handling.\n"
        "  - Emergency shutdown: Press ESD button located on MCC-3 panel."
    )
    page3.insert_text((72, 240), safety, fontsize=10, fontname="helv")

    page3.insert_text((72, 380), "7. Troubleshooting", fontsize=14, fontname="helv")
    trouble = (
        "Common issues and corrective actions:\n"
        "  - Excessive vibration: Check alignment, inspect impeller, verify bearing condition.\n"
        "  - Low flow/discharge pressure: Check for clogged suction strainer, verify impeller "
        "diameter setting, check for air in suction line.\n"
        "  - Seal leakage: If leakage > 3 ml/hr, replace mechanical seal per Section 4.\n"
        "  - Motor overload: Check for pump seizure, verify impeller clearance, check motor winding.\n"
        "  - Unusual noise: Cavitation (check NPSH), bearing failure (vibration analysis), "
        "or mechanical contact (shut down immediately)."
    )
    page3.insert_text((72, 400), trouble, fontsize=10, fontname="helv")

    doc.save(output_path)
    doc.close()
    print(f"Created: {output_path}")


if __name__ == "__main__":
    create_pump_p102_pdf("data/documents/Pump_P102_Maintenance_Manual.pdf")
