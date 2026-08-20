# Supplied Surgery Report Workbook Reference

Source: `/home/ubuntu/upload/SurgeriesSheet.xlsx`, reviewed on 2026-08-20.

The workbook contains eleven worksheets. The largest are **ALL SUR 2025** (1,972 rows, 14 columns) and **ALL SUR 2026** (1,626 rows, 14 columns). It also includes hospital-specific sheets such as **ABU ZENAHA**, **EMC FROM 12-4-2026**, and **EMC**.

The primary report pattern is one surgery header row followed by one or more implant-detail rows. Header fields observed in the historical sheets include: `NO. LP`, `File Number`, `CODE`, `ITEMS`, `QTY`, `DATE`, `Dr.`, `QUOTATION`, `INVOICE` or `UNT`, `HOSPITAL`, patient name, prior price, and cost.

The FFM reporting workspace should preserve the operational intent without importing historical patient data into FFM. The on-screen surgery report and individual Excel exports will therefore present the available FFM equivalents: surgery date, procedure, hospital and city, doctor, assigned Delegate, assigned Manager, implant code, implant item, quantity, unit price, currency, line total, and per-surgery total. Unavailable historical-only fields such as file number, patient name, quotation, and invoice will not be fabricated.
