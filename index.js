// pages/index.js
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Chart, BarElement, CategoryScale, LinearScale } from "chart.js";
import styles from "../styles/Home.module.css"; // ajuste se estiver usando outro caminho

Chart.register(BarElement, CategoryScale, LinearScale);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function Home() {
  const [mes, setMes] = useState("");
  const [valorRecebido, setValorRecebido] = useState(0);
  // cada desconto tem id (para key React), descricao (string), valor (number) e pago (bool)
  const [descontos, setDescontos] = useState([
    { id: Date.now() + Math.random(), descricao: "", valor: 0, pago: false },
  ]);

  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);

  useEffect(() => {
    setMes(new Date().toISOString().slice(0, 7));
    carregarUltimoMes();
  }, []);

  async function carregarUltimoMes() {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from("meses")
        .select("*")
        .order("id", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const ultimo = data[0];
        const desc = ultimo.desconto_descricao || [];
        const val = ultimo.desconto_valor || [];
        const arr = [];
        for (let i = 0; i < desc.length; i++) {
          arr.push({ id: Date.now() + Math.random() + i, descricao: String(desc[i] || ""), valor: Number(val[i] || 0), pago: false });
        }
        if (arr.length) setDescontos(arr);
      }
    } catch (err) {
      console.error("Erro carregando último mês:", err);
    }
  }

  // CORREÇÃO IMPORTANTE: atualiza apenas o campo correto; não faz parseFloat para descrição
  const handleDescontoChange = (index, field, rawValue) => {
    setDescontos((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        // se campo for 'valor', converte para número; se for 'pago', recebe boolean; se for 'descricao', recebe string
        if (field === "valor") {
          const num = parseFloat(rawValue);
          return { ...item, valor: isNaN(num) ? 0 : num };
        } else if (field === "pago") {
          return { ...item, pago: !!rawValue };
        } else {
          return { ...item, descricao: String(rawValue) };
        }
      })
    );
  };

  const adicionarLinha = () => {
    setDescontos((prev) => [...prev, { id: Date.now() + Math.random(), descricao: "", valor: 0, pago: false }]);
  };

  const removerLinha = (index) => {
    setDescontos((prev) => prev.filter((_, i) => i !== index));
  };

  const encerrarMes = async () => {
    const descontoDescricao = descontos.map((d) => d.descricao);
    const descontoValor = descontos.map((d) => d.valor);
    const descontoPago = descontos.map((d) => d.pago);

    if (supabase) {
      try {
        await supabase.from("meses").insert([
          {
            mes,
            valor_recebido: valorRecebido,
            desconto_descricao: descontoDescricao,
            desconto_valor: descontoValor,
            desconto_pago: descontoPago,
          },
        ]);
        alert("Mês salvo no Supabase!");
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar no Supabase (veja console).");
      }
    } else {
      alert("Supabase não configurado - salvando apenas localmente (teste).");
    }
    mostrarGrafico();
  };

  const mostrarGrafico = () => {
    const totalDescontos = descontos.reduce((sum, d) => (d.pago ? sum + Number(d.valor || 0) : sum), 0);
    const sobra = Number(valorRecebido || 0) - totalDescontos;

    const ctx = chartRef.current && chartRef.current.getContext ? chartRef.current.getContext("2d") : null;
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    const newChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Recebido", "Descontos Pagos", "Sobra"],
        datasets: [{ label: `Mês ${mes}`, data: [valorRecebido, totalDescontos, sobra], backgroundColor: ["#3b82f6", "#ef4444", "#10b981"] }],
      },
      options: { responsive: true },
    });
    setChartInstance(newChart);
  };

  const totalDescontos = descontos.reduce((sum, d) => (d.pago ? sum + Number(d.valor || 0) : sum), 0);
  const sobra = Number(valorRecebido || 0) - totalDescontos;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Controle Financeiro Online</h1>

      <div className={styles.inputGroup}>
        <label>
          Mês:
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
        <label>
          Valor Recebido (R$):
          <input type="number" value={valorRecebido} onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)} />
        </label>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Pago</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {descontos.map((d, i) => (
            <tr key={d.id} className={d.pago && d.valor > 0 ? styles.rowPaid : !d.pago && d.valor > 0 ? styles.rowPending : ""}>
              <td>
                {/* descrição como texto normal */}
                <input
                  type="text"
                  value={d.descricao}
                  onChange={(e) => handleDescontoChange(i, "descricao", e.target.value)}
                  placeholder="Ex: Aluguel"
                />
              </td>
              <td>
                {/* valor como número */}
                <input
                  type="number"
                  step="0.01"
                  value={d.valor}
                  onChange={(e) => handleDescontoChange(i, "valor", e.target.value)}
                />
              </td>
              <td>
                {/* pago como checkbox */}
                <input type="checkbox" checked={d.pago} onChange={(e) => handleDescontoChange(i, "pago", e.target.checked)} />
              </td>
              <td>
                <button onClick={() => removerLinha(i)}>Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.buttonGroup}>
        <button className={`${styles.button} ${styles.addButton}`} onClick={adicionarLinha}>
          Adicionar Desconto
        </button>
        <button className={`${styles.button} ${styles.saveButton}`} onClick={encerrarMes}>
          Encerrar Mês
        </button>
      </div>

      <div className={styles.totalCard}>
        <div className={`${styles.card} ${styles.cardRecebido}`}>Recebido: R$ {Number(valorRecebido || 0).toFixed(2)}</div>
        <div className={`${styles.card} ${styles.cardDescontos}`}>Descontos Pagos: R$ {totalDescontos.toFixed(2)}</div>
        <div className={`${styles.card} ${styles.cardSobra}`}>Sobra: R$ {sobra.toFixed(2)}</div>
      </div>

      <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Gráfico Mensal</h2>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
