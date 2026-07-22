import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AmortizationDashboard() {
  // --- Tab State ---
  const [activeTab, setActiveTab] = useState("amortization");

  // --- Loan Inputs ---
  const [amount, setAmount] = useState();
  const [rate, setRate] = useState();
  const [term, setTerm] = useState(30);
  const [extraPrincipal, setExtraPrincipal] = useState(0);

  // --- Current Loan Inputs (For Savings Comparison) ---
  const [currentPI, setCurrentPI] = useState("");
  const [currentPMI, setCurrentPMI] = useState("");

  // --- Points Analysis State ---
  const [opt1Rate, setOpt1Rate] = useState("");
  const [opt1Cost, setOpt1Cost] = useState("");
  const [opt2Rate, setOpt2Rate] = useState("");
  const [opt2Cost, setOpt2Cost] = useState("");
  const [opt3Rate, setOpt3Rate] = useState("");
  const [opt3Cost, setOpt3Cost] = useState("");

  // --- Helper Functions ---
  const calcPMT = (r, years, amt) => {
    if (!amt || !years) return 0;
    const monthlyRate = r / 100 / 12;
    const n = years * 12;
    if (monthlyRate === 0) return amt / n;
    return (amt * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  };

  const formatCurrency = (val) => {
    if (isNaN(val) || val === null || val === undefined) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatMonthsToYears = (totalMonths) => {
    if (isNaN(totalMonths) || !totalMonths) return "Never";
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return y > 0 ? `${y} Yrs, ${m} Mos` : `${m} Mos`;
  };

  // --- Core Amortization Engine ---
  const data = useMemo(() => {
    const pAmt = Number(amount) || 0;
    const pRate = Number(rate) || 0;
    const pTerm = Number(term) || 0;
    const pExtra = Number(extraPrincipal) || 0;

    const pCurrentPI = Number(currentPI) || 0;
    const pCurrentPMI = Number(currentPMI) || 0;

    const basePmt = calcPMT(pRate, pTerm, pAmt);
    const monthlyRate = pRate / 100 / 12;
    const maxMonths = pTerm * 12;

    // Cash Flow Savings Math
    const hasCurrentLoan = pCurrentPI > 0 || pCurrentPMI > 0;
    const monthlyCashFlowSavings = hasCurrentLoan
      ? pCurrentPI + pCurrentPMI - basePmt
      : 0;

    // Standard Loan (No Extra Principal)
    let standardBal = pAmt;
    let standardTotalInterest = 0;
    let standardMonths = 0;

    for (let i = 1; i <= maxMonths; i++) {
      if (standardBal <= 0) break;
      const interest = standardBal * monthlyRate;
      standardTotalInterest += interest;
      const principal = basePmt - interest;
      standardBal -= principal;
      standardMonths = i;
    }

    // Accelerated Loan (With Extra Principal)
    let accBal = pAmt;
    let accTotalInterest = 0;
    let accMonths = 0;
    const chartData = [];

    for (let month = 1; month <= maxMonths; month++) {
      if (accBal <= 0) break;

      const interestThisMonth = accBal * monthlyRate;
      accTotalInterest += interestThisMonth;

      let basePrincipalThisMonth = basePmt - interestThisMonth;

      // Handle final payment edge case
      if (accBal < basePrincipalThisMonth + pExtra) {
        basePrincipalThisMonth = accBal;
      }

      accBal -= basePrincipalThisMonth + pExtra;
      if (accBal < 0) accBal = 0;
      accMonths = month;

      // Calculate the standard trajectory for comparison in the chart
      let expectedStandardBal = pAmt;
      for (let j = 1; j <= month; j++) {
        expectedStandardBal -= basePmt - expectedStandardBal * monthlyRate;
      }

      chartData.push({
        month,
        standardBalance: Math.max(0, Math.round(expectedStandardBal)),
        accBalance: Math.round(accBal),
        totalPI: Math.round(basePrincipalThisMonth + interestThisMonth),
        principal: Math.round(basePrincipalThisMonth),
        interest: Math.round(interestThisMonth),
        extraApplied: Math.round(pExtra),
      });
    }

    return {
      basePmt,
      standardMonths,
      accMonths,
      monthsSaved: standardMonths - accMonths,
      standardTotalInterest,
      accTotalInterest,
      interestSaved: standardTotalInterest - accTotalInterest,
      chartData,
      hasCurrentLoan,
      pCurrentPMI,
      monthlyCashFlowSavings,
    };
  }, [amount, rate, term, extraPrincipal, currentPI, currentPMI]);

  // --- Points Analysis Engine ---
  const pointsData = useMemo(() => {
    const amtNew = Number(amount) || 0;
    const termNew = Number(term) || 0;
    const maxMonths = termNew * 12;

    const calcPointsOpt = (rStr, cStr) => {
      const r = Number(rStr) || 0;
      const c = Number(cStr) || 0;
      const pmt = calcPMT(r, termNew, amtNew);
      const sav = Math.max(0, data.basePmt - pmt);
      const be = sav > 0 ? c / sav : 0;
      const totalInt = termNew > 0 ? pmt * maxMonths - amtNew : 0;
      const intSaved = data.standardTotalInterest - totalInt;
      return { pmt, sav, c, be, totalInt, intSaved };
    };

    const opt1 = calcPointsOpt(opt1Rate, opt1Cost);
    const opt2 = calcPointsOpt(opt2Rate, opt2Cost);
    const opt3 = calcPointsOpt(opt3Rate, opt3Cost);

    return { opt1, opt2, opt3 };
  }, [
    amount,
    term,
    opt1Rate,
    opt1Cost,
    opt2Rate,
    opt2Cost,
    opt3Rate,
    opt3Cost,
    data.basePmt,
    data.standardTotalInterest,
  ]);

  // --- Styles ---
  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "4px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
  };
  const cardStyle = {
    background: "#fff",
    padding: "20px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  };
  const cardLabelStyle = {
    fontSize: "12px",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "bold",
  };
  const cardValueStyle = {
    fontSize: "24px",
    fontWeight: "900",
    color: "#1f2937",
    marginTop: "5px",
  };
  const tabStyle = (isActive) => ({
    padding: "12px 24px",
    cursor: "pointer",
    background: isActive ? "#2563eb" : "#e5e7eb",
    color: isActive ? "white" : "#4b5563",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px 8px 0 0",
    fontSize: "15px",
  });

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "20px",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "5px",
          borderBottom: "3px solid #2563eb",
        }}
      >
        <button
          style={tabStyle(activeTab === "amortization")}
          onClick={() => setActiveTab("amortization")}
        >
          📊 Amortization & Payoff
        </button>
        <button
          style={tabStyle(activeTab === "points")}
          onClick={() => setActiveTab("points")}
        >
          ⚖️ Rate & Points Options
        </button>
      </div>

      {activeTab === "amortization" && (
        <div style={{ animation: "fadeIn 0.3s" }}>
          {/* Inputs Section */}
          <div
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "0 12px 12px 12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              marginBottom: "25px",
            }}
          >
            <h3
              style={{
                margin: "0 0 15px 0",
                color: "#374151",
                borderBottom: "2px solid #e5e7eb",
                paddingBottom: "10px",
              }}
            >
              Proposed Loan Details
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
              }}
            >
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#4b5563",
                }}
              >
                Loan Amount ($):
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={inputStyle}
                />
              </label>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#4b5563",
                }}
              >
                Interest Rate (%):
                <input
                  type="number"
                  step="0.125"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  style={inputStyle}
                />
              </label>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#4b5563",
                }}
              >
                Term (Years):
                <input
                  type="number"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  style={inputStyle}
                />
              </label>
            </div>

            <h3
              style={{
                margin: "25px 0 15px 0",
                color: "#374151",
                borderBottom: "2px solid #e5e7eb",
                paddingBottom: "10px",
              }}
            >
              Current Loan (For Savings Comparison)
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
              }}
            >
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#4b5563",
                }}
              >
                Current Monthly P&I ($):
                <input
                  type="number"
                  value={currentPI}
                  onChange={(e) => setCurrentPI(e.target.value)}
                  style={inputStyle}
                  placeholder="Leave blank if N/A"
                />
              </label>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#4b5563",
                }}
              >
                Current Monthly PMI ($):
                <input
                  type="number"
                  value={currentPMI}
                  onChange={(e) => setCurrentPMI(e.target.value)}
                  style={inputStyle}
                  placeholder="Leave blank if N/A"
                />
              </label>
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#15803d",
                }}
              >
                Extra Monthly Principal Applied ($):
                <input
                  type="number"
                  value={extraPrincipal}
                  onChange={(e) => setExtraPrincipal(Number(e.target.value))}
                  style={{ ...inputStyle, border: "1px solid #86efac" }}
                />
              </label>
            </div>
          </div>

          {/* Metrics Dashboard */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
              marginBottom: "25px",
            }}
          >
            {data.hasCurrentLoan && (
              <div
                style={{
                  ...cardStyle,
                  borderTop: "4px solid #10b981",
                  background:
                    data.monthlyCashFlowSavings >= 0 ? "#f0fdf4" : "#fef2f2",
                  borderColor:
                    data.monthlyCashFlowSavings >= 0 ? "#bbf7d0" : "#fca5a5",
                }}
              >
                <div
                  style={{
                    ...cardLabelStyle,
                    color:
                      data.monthlyCashFlowSavings >= 0 ? "#047857" : "#b91c1c",
                  }}
                >
                  {data.monthlyCashFlowSavings >= 0
                    ? "Monthly Savings (vs Current)"
                    : "Monthly Increase (vs Current)"}
                </div>
                <div
                  style={{
                    ...cardValueStyle,
                    color:
                      data.monthlyCashFlowSavings >= 0 ? "#065f46" : "#991b1b",
                  }}
                >
                  {formatCurrency(Math.abs(data.monthlyCashFlowSavings))}
                </div>
                {data.pCurrentPMI > 0 && (
                  <div
                    style={{
                      fontSize: "12px",
                      color:
                        data.monthlyCashFlowSavings >= 0
                          ? "#15803d"
                          : "#b91c1c",
                      marginTop: "4px",
                      fontWeight: "600",
                    }}
                  >
                    *Factors in {formatCurrency(data.pCurrentPMI)} PMI removed
                  </div>
                )}
              </div>
            )}

            <div style={{ ...cardStyle, borderTop: "4px solid #3b82f6" }}>
              <div style={cardLabelStyle}>New Monthly P&I</div>
              <div style={cardValueStyle}>{formatCurrency(data.basePmt)}</div>
            </div>

            <div style={{ ...cardStyle, borderTop: "4px solid #ef4444" }}>
              <div style={cardLabelStyle}>Standard Payoff Time</div>
              <div style={cardValueStyle}>
                {formatMonthsToYears(data.standardMonths)}
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                background: data.monthsSaved > 0 ? "#eff6ff" : "#fff",
                borderTop: "4px solid #8b5cf6",
              }}
            >
              <div style={{ ...cardLabelStyle, color: "#6d28d9" }}>
                Accelerated Payoff Time
              </div>
              <div style={{ ...cardValueStyle, color: "#4c1d95" }}>
                {formatMonthsToYears(data.accMonths)}
              </div>
              {data.monthsSaved > 0 && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#15803d",
                    marginTop: "5px",
                    fontWeight: "bold",
                  }}
                >
                  ↓ Time Saved: {formatMonthsToYears(data.monthsSaved)}
                </div>
              )}
            </div>

            <div
              style={{
                ...cardStyle,
                background: data.interestSaved > 0 ? "#fef08a" : "#fff",
                borderTop: "4px solid #eab308",
              }}
            >
              <div style={{ ...cardLabelStyle, color: "#854d0e" }}>
                Total Interest Saved
              </div>
              <div style={{ ...cardValueStyle, color: "#a16207" }}>
                {formatCurrency(data.interestSaved)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              marginBottom: "25px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{ marginTop: 0, color: "#374151", marginBottom: "20px" }}
            >
              Principal Balance Trajectory
            </h3>
            <div style={{ height: "350px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="month"
                    label={{
                      value: "Months",
                      position: "insideBottomRight",
                      offset: -5,
                    }}
                  />
                  <YAxis tickFormatter={(val) => "$" + val / 1000 + "k"} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => "Month " + label}
                  />
                  <Legend verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="standardBalance"
                    name="Standard Balance"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="accBalance"
                    name="Accelerated Balance"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Amortization Table */}
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{ marginTop: 0, color: "#374151", marginBottom: "15px" }}
            >
              Amortization Schedule
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "20px",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
              }}
            >
              <div style={{ flex: "1 1 auto" }}>
                <span
                  style={{
                    color: "#64748b",
                    fontWeight: "600",
                    display: "block",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  Standard Payoff
                </span>
                <span
                  style={{
                    color: "#0f172a",
                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                >
                  {formatMonthsToYears(data.standardMonths)}
                </span>
              </div>
              <div
                style={{
                  flex: "1 1 auto",
                  borderLeft: "1px solid #cbd5e1",
                  paddingLeft: "15px",
                }}
              >
                <span
                  style={{
                    color: "#6d28d9",
                    fontWeight: "600",
                    display: "block",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  Accelerated Payoff
                </span>
                <span
                  style={{
                    color: "#4c1d95",
                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                >
                  {formatMonthsToYears(data.accMonths)}
                </span>
              </div>
              <div
                style={{
                  flex: "1 1 auto",
                  borderLeft: "1px solid #cbd5e1",
                  paddingLeft: "15px",
                }}
              >
                <span
                  style={{
                    color: "#854d0e",
                    fontWeight: "600",
                    display: "block",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  Total Interest Saved
                </span>
                <span
                  style={{
                    color: "#15803d",
                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                >
                  {formatCurrency(data.interestSaved)}
                </span>
              </div>
            </div>

            <div
              style={{
                overflowX: "auto",
                maxHeight: "400px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#f3f4f6",
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #d1d5db",
                      }}
                    >
                      Month
                    </th>
                    <th
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #d1d5db",
                      }}
                    >
                      Balance
                    </th>
                    <th
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #d1d5db",
                      }}
                    >
                      Total P&I
                    </th>
                    <th
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #d1d5db",
                      }}
                    >
                      Principal
                    </th>
                    <th
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #d1d5db",
                      }}
                    >
                      Interest
                    </th>
                    <th
                      style={{
                        padding: "10px",
                        borderBottom: "2px solid #d1d5db",
                        color: "#166534",
                      }}
                    >
                      Extra Applied
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.chartData.map((row) => (
                    <tr
                      key={row.month}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ padding: "10px" }}>{row.month}</td>
                      <td style={{ padding: "10px", fontWeight: "500" }}>
                        {formatCurrency(row.accBalance)}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {formatCurrency(row.totalPI)}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {formatCurrency(row.principal)}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {formatCurrency(row.interest)}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          color: row.extraApplied > 0 ? "#15803d" : "inherit",
                          fontWeight: row.extraApplied > 0 ? "600" : "normal",
                        }}
                      >
                        {formatCurrency(row.extraApplied)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "points" && (
        <div
          style={{
            animation: "fadeIn 0.3s",
            background: "#fff",
            padding: "25px",
            borderRadius: "0 12px 12px 12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#374151",
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: "10px",
            }}
          >
            Rate Buy-Down Analysis
          </h3>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "25px" }}
          >
            Compare options against your base proposed loan to determine the
            break-even horizon for paying points.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Options Mapper */}
            {[
              {
                title: "Option 1",
                rVal: opt1Rate,
                cVal: opt1Cost,
                setR: setOpt1Rate,
                setC: setOpt1Cost,
                optData: pointsData.opt1,
                bg: "#f9fafb",
                color: "#4b5563",
              },
              {
                title: "Option 2",
                rVal: opt2Rate,
                cVal: opt2Cost,
                setR: setOpt2Rate,
                setC: setOpt2Cost,
                optData: pointsData.opt2,
                bg: "#eff6ff",
                color: "#1d4ed8",
              },
              {
                title: "Option 3",
                rVal: opt3Rate,
                cVal: opt3Cost,
                setR: setOpt3Rate,
                setC: setOpt3Cost,
                optData: pointsData.opt3,
                bg: "#f5f3ff",
                color: "#6d28d9",
              },
            ].map((col, i) => (
              <div
                key={i}
                style={{
                  background: col.bg,
                  border: `1px solid ${col.color}40`,
                  borderRadius: "8px",
                  padding: "20px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 15px 0",
                    color: col.color,
                    textAlign: "center",
                  }}
                >
                  {col.title}
                </h4>
                <div
                  style={{ display: "flex", gap: "10px", marginBottom: "15px" }}
                >
                  <label
                    style={{
                      flex: 1,
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: col.color,
                    }}
                  >
                    Rate (%):{" "}
                    <input
                      type="number"
                      step="0.125"
                      value={col.rVal}
                      onChange={(e) => col.setR(e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                  <label
                    style={{
                      flex: 1,
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: col.color,
                    }}
                  >
                    Points Cost ($):{" "}
                    <input
                      type="number"
                      value={col.cVal}
                      onChange={(e) => col.setC(e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                </div>
                <div
                  style={{
                    background: "#fff",
                    padding: "15px",
                    borderRadius: "6px",
                    border: `1px solid ${col.color}40`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>Monthly P&I:</span>
                    <span style={{ fontWeight: "bold" }}>
                      {formatCurrency(col.optData.pmt)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      Mo. Savings vs Base:
                    </span>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: col.optData.sav > 0 ? "#15803d" : "#ef4444",
                      }}
                    >
                      {formatCurrency(col.optData.sav)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "10px",
                      borderTop: "1px solid #e5e7eb",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "#6b7280", fontWeight: "500" }}>
                      Break-Even:
                    </span>
                    <span style={{ fontWeight: "bold", color: "#3b82f6" }}>
                      {col.optData.be > 0
                        ? `${Math.ceil(col.optData.be)} Mos`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
