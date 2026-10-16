<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayPal AI Invoice Agent</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: Arial, Helvetica, sans-serif;
            background: #f4f6f9;
            color: #1f2933;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            background: #003087;
            color: #ffffff;
            padding: 24px;
        }
        header h1 { font-size: 24px; }
        header p { font-size: 14px; opacity: 0.85; margin-top: 4px; }

        main {
            flex: 1;
            max-width: 900px;
            width: 100%;
            margin: 24px auto;
            padding: 0 16px;
        }

        .card {
            background: #ffffff;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
            margin-bottom: 20px;
        }

        table { width: 100%; border-collapse: collapse; }
        th, td {
            text-align: left;
            padding: 12px 8px;
            border-bottom: 1px solid #e4e7eb;
            font-size: 14px;
        }
        th { color: #616e7c; font-weight: 600; }

        .badge {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.paid { background: #d3f9e0; color: #0f7a3a; }
        .badge.unpaid { background: #fff3c4; color: #8a6100; }
        .badge.overdue { background: #ffd6d6; color: #a11d1d; }

        button {
            background: #009cde;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
        }
        button:hover { background: #0081b5; }
        button:focus { outline: 3px solid #a6dcf5; }
        button.secondary { background: #e4e7eb; color: #1f2933; }
        button.secondary:hover { background: #cbd2d9; }

        .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }

        .reminder {
            border-left: 4px solid #009cde;
            background: #f0f8fc;
            padding: 12px 16px;
            margin-top: 12px;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.5;
        }
        .reminder strong { display: block; margin-bottom: 4px; }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .modal-overlay.open { display: flex; }
        .modal {
            background: #ffffff;
            border-radius: 10px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
        }
        .modal h2 { font-size: 18px; margin-bottom: 8px; }
        .modal p { font-size: 14px; color: #616e7c; margin-bottom: 16px; }
        .modal .actions { justify-content: flex-end; margin-top: 0; }

        .success {
            display: none;
            color: #0f7a3a;
            font-weight: 600;
            margin-top: 12px;
        }
        .success.show { display: block; }

        footer {
            text-align: center;
            font-size: 12px;
            color: #616e7c;
            padding: 16px;
        }
    </style>
</head>
<body>

    <header>
        <h1>PayPal AI Invoice Agent</h1>
        <p>AI se reminder emails banayein aur approval ke baad bhejें</p>
    </header>

    <main>
        <section class="card">
            <h2>Invoices</h2>
            <table>
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Amount (USD)</th>
                        <th>Due date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="invoice-body"></tbody>
            </table>

            <div class="actions">
                <button id="generate-btn">Generate reminder emails</button>
            </div>

            <div id="reminders"></div>

            <div class="actions" id="approve-area" style="display:none;">
                <button id="approve-btn">Approve &amp; send</button>
            </div>

            <p class="success" id="success-msg">Sandbox mein reminders "bhej diye" gaye (demo only).</p>
        </section>
    </main>

    <div class="modal-overlay" id="modal">
        <div class="modal">
            <h2>Kya aap sure hain?</h2>
            <p>Ye sirf demo hai. Koi real email ya payment nahi jayega.</p>
            <div class="actions">
                <button class="secondary" id="cancel-btn">Cancel</button>
                <button id="confirm-btn">Confirm</button>
            </div>
        </div>
    </div>

    <footer>Sandbox demo only</footer>

    <script>
        // Dummy data (baad mein backend se aayega)
        const invoices = [
            { id: 1, client: "Rahul Sharma", amount: 450, dueDate: "2026-10-10", status: "overdue" },
            { id: 2, client: "Priya Designs", amount: 1200, dueDate: "2026-10-20", status: "unpaid" },
            { id: 3, client: "Acme Studio", amount: 800, dueDate: "2026-10-05", status: "paid" },
            { id: 4, client: "Nexa Tech", amount: 2300, dueDate: "2026-10-25", status: "unpaid" }
        ];

        const invoiceBody = document.getElementById("invoice-body");
        const remindersDiv = document.getElementById("reminders");
        const approveArea = document.getElementById("approve-area");
        const successMsg = document.getElementById("success-msg");
        const modal = document.getElementById("modal");

        // Table render karna
        function renderInvoices() {
            invoiceBody.innerHTML = "";
            invoices.forEach(inv => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${inv.client}</td>
                    <td>$${inv.amount}</td>
                    <td>${inv.dueDate}</td>
                    <td><span class="badge ${inv.status}">${capitalize(inv.status)}</span></td>
                `;
                invoiceBody.appendChild(row);
            });
        }

        function capitalize(text) {
            return text.charAt(0).toUpperCase() + text.slice(1);
        }

        // Generate button: unpaid invoices ke liye dummy reminder dikhana
        document.getElementById("generate-btn").addEventListener("click", () => {
            remindersDiv.innerHTML = "";
            successMsg.classList.remove("show");

            const unpaid = invoices.filter(inv => inv.status !== "paid");

            unpaid.forEach(inv => {
                const box = document.createElement("div");
                box.className = "reminder";
                box.innerHTML = `
                    <strong>To: ${inv.client}</strong>
                    Hello ${inv.client}, aapka $${inv.amount} ka invoice due date ${inv.dueDate} ko hai. Kripya jald payment kar dein. Dhanyavaad.
                `;
                remindersDiv.appendChild(box);
            });

            approveArea.style.display = unpaid.length ? "flex" : "none";
        });

        // Approve button: modal kholna
        document.getElementById("approve-btn").addEventListener("click", () => {
            modal.classList.add("open");
        });

        // Modal buttons
        document.getElementById("cancel-btn").addEventListener("click", () => {
            modal.classList.remove("open");
        });

        document.getElementById("confirm-btn").addEventListener("click", () => {
            modal.classList.remove("open");
            successMsg.classList.add("show");
            approveArea.style.display = "none";
        });

        renderInvoices();
    </script>

</body>
</html>
