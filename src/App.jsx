import { useEffect, useState } from "react";

const STORAGE_KEY = "digital-wallet-v1";

// Amounts are stored as integer paise to avoid floating-point errors.
const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function loadWallet() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isInteger(saved.balance) && Array.isArray(saved.transactions)) return saved;
  } catch {
    /* ignore corrupted or unavailable storage */
  }
  return { balance: 0, transactions: [] };
}

function parseAmount(text) {
  if (!/^\d+(\.\d{1,2})?$/.test(text.trim())) return null;
  const paise = Math.round(parseFloat(text) * 100);
  return paise > 0 ? paise : null;
}

function MoneyForm({ title, button, placeholder, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const paise = parseAmount(amount);
    if (!paise) return setError("Enter an amount above 0, with up to 2 decimal places.");
    const problem = onSubmit(paise, note.trim());
    if (problem) return setError(problem);
    setAmount("");
    setNote("");
    setError("");
  };

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2>{title}</h2>
      <label>
        Amount (₹)
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-invalid={Boolean(error)}
        />
      </label>
      <label>
        Note (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder} maxLength={60} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">{button}</button>
    </form>
  );
}

export default function App() {
  const [wallet, setWallet] = useState(loadWallet);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
    } catch {
      /* storage full or blocked */
    }
  }, [wallet]);

  const record = (type, amount, note) =>
    setWallet((w) => ({
      balance: type === "added" ? w.balance + amount : w.balance - amount,
      transactions: [
        { id: crypto.randomUUID(), type, amount, note, date: new Date().toISOString() },
        ...w.transactions,
      ],
    }));

  const addMoney = (amount, note) => {
    record("added", amount, note || "Money added");
    return null;
  };

  const spendMoney = (amount, note) => {
    if (amount > wallet.balance)
      return `Not enough balance. You have ${formatMoney(wallet.balance)} available.`;
    record("spent", amount, note || "Payment");
    return null;
  };

  const visible = wallet.transactions.filter((t) => filter === "all" || t.type === filter);

  return (
    <main className="app">
      <header className="balance-card">
        <p className="balance-label">Wallet balance</p>
        <p className="balance-amount">{formatMoney(wallet.balance)}</p>
      </header>

      <section className="forms">
        <MoneyForm title="Add money" button="Add to wallet" placeholder="e.g. Salary" onSubmit={addMoney} />
        <MoneyForm title="Record a payment" button="Pay from wallet" placeholder="e.g. Groceries" onSubmit={spendMoney} />
      </section>

      <section className="panel history">
        <div className="history-head">
          <h2>Transactions</h2>
          <div className="filters" role="group" aria-label="Filter transactions">
            {[
              ["all", "All"],
              ["added", "Money added"],
              ["spent", "Money spent"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "chip active" : "chip"}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="empty">
            {wallet.transactions.length === 0
              ? "No transactions yet. Add money to get started."
              : "No transactions match this filter."}
          </p>
        ) : (
          <ul className="list">
            {visible.map((t) => (
              <li key={t.id} className={`row ${t.type}`}>
                <div>
                  <p className="row-note">{t.note}</p>
                  <p className="row-meta">{t.type === "added" ? "Added" : "Spent"} · {formatDate(t.date)}</p>
                </div>
                <p className="row-amount">
                  {t.type === "added" ? "+" : "−"}
                  {formatMoney(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
