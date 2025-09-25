import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { supabase } from "../utils/supabaseClient";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function Home() {
  const [recebido, setRecebido] = useState(0);
  const [descontos, setDescontos] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [graficoData, setGraficoData] = useState(null);

  // Carregar último mês encerrado ao abrir
  useEffect(() => {
    const carregarUltimoMes = async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .order("id", { ascending: false })
        .limit(1);

      if (!error && data.length > 0) {
        const mes = data[0];
        setGraficoData({
          labels: ["Recebido", "Descontos", "Sobra"],
          datasets: [
            {
              label: mes.mes,
              data: [mes.recebido, mes.descontos, mes.sobra],
              backgroundColor: ["#3b82f6", "#ef4444", "#10b981"],
            },
          ],
        });
      }
    };
    carregarUltimoMes();
  }, []);

  const adicionarDesconto = () => {
    setDescontos([...descontos, { descricao: "", valor: 0, pago: false }]);
  };

  const atualizarDesconto = (index, campo, valor) => {
    const novos = [...descontos];
    novos[index][campo] = campo === "valor" ? parseFloat(valor) || 0 : valor;
    setDescontos(novos);
  };

  const calcularTotais = () => {
    const totalDescontos = descontos
      .filter((d) => d.pago)
      .reduce((acc, d) => acc + d.valor, 0);
    const sobra = recebido - totalDescontos;
    return { totalDescontos, sobra };
  };

  const encerrarMes = async () => {
    const { totalDescontos, sobra } = calcularTotais();

    const { error } = await supabase.from("financeiro").insert([
      {
        mes: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        recebido,
        descontos: totalDescontos,
        sobra,
      },
    ]);

    if (!error) {
      alert("Mês encerrado e salvo com sucesso!");
      setDescontos([]); // limpa
      setGraficoData({
        labels: ["Recebido", "Descontos", "Sobra"],
        datasets: [
          {
            label: "Mês Atual",
            data: [recebido, totalDescontos, sobra],
            backgroundColor: ["#3b82f6", "#ef4444", "#10b981"],
          },
        ],
      });
      setRecebido(0);
    }
  };

  const { totalDescontos, sobra } = calcularTotais();

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ""}`}>
      <h1 className={styles.title}>💰 Controle Financeiro</h1>

      {/* Botão Dark Mode */}
      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <button
          className={styles.toggleButton}
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? "🌞 Modo Claro" : "🌙 Modo Escuro"}
        </button>
      </div>

      {/* Entrada */}
      <div className={styles.inputGroup}>
        <label>
          Valor Recebido:
          <input
            type="number"
            value={recebido}
            onChange={(e) => setRecebido(parseFloat(e.target.value) || 0)}
          />
        </label>
      </div>

      {/* Tabela de descontos */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Pago</th>
          </tr>
        </thead>
        <tbody>
          {descontos.map((d, i) => (
            <tr
              key={i}
              className={d.pago ? styles.rowPaid : styles.rowPending}
            >
              <td>
                <input
                  type="text"
                  value={d.descricao}
                  onChange={(e) =>
                    atualizarDesconto(i, "descricao", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={d.valor}
                  onChange={(e) =>
                    atualizarDesconto(i, "valor", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={d.pago}
                  onChange={(e) =>
                    atualizarDesconto(i, "pago", e.target.checked)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Botões */}
      <div className={styles.buttonGroup}>
        <button onClick={adicionarDesconto} className={`${styles.button} ${styles.addButton}`}>
          ➕ Adicionar Desconto
        </button>
        <button onClick={encerrarMes} className={`${styles.button} ${styles.saveButton}`}>
          ✅ Encerrar Mês
        </button>
      </div>

      {/* Totais */}
      <div className={styles.totalCard}>
        <div className={`${styles.card} ${styles.cardRecebido}`}>
          Recebido: R$ {recebido.toFixed(2)}
        </div>
        <div className={`${styles.card} ${styles.cardDescontos}`}>
          Descontos: R$ {totalDescontos.toFixed(2)}
        </div>
        <div className={`${styles.card} ${styles.cardSobra}`}>
          Sobra: R$ {sobra.toFixed(2)}
        </div>
      </div>

      {/* Gráfico */}
      {graficoData && (
        <div style={{ background: "white", padding: "1rem", borderRadius: "12px" }}>
          <Bar data={graficoData} />
        </div>
      )}
    </div>
  );
}
