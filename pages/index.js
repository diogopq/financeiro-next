import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { supabase } from "../utils/supabaseClient";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import jsPDF from "jspdf";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function Home() {
  const router = useRouter();
  const [recebido, setRecebido] = useState(0);
  const [descontos, setDescontos] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [graficoData, setGraficoData] = useState(null);

  // Bloquear acesso se não logado
  useEffect(() => {
    const checarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
    };
    checarUsuario();
  }, []);

  // Carregar último mês encerrado
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

  const adicionarDesconto = () => setDescontos([...descontos, { descricao: "", valor: 0, pago: false }]);

  const atualizarDesconto = (index, campo, valor) => {
    const novos = [...descontos];
    novos[index][campo] = campo === "valor" ? parseFloat(valor) || 0 : valor;
    setDescontos(novos);
  };

  const calcularTotais = () => {
    const totalDescontos = descontos.filter(d => d.pago).reduce((acc,d)=>acc+d.valor,0);
    const sobra = recebido - totalDescontos;
    return { totalDescontos, sobra };
  };

  const encerrarMes = async () => {
    const { totalDescontos, sobra } = calcularTotais();
    const { error } = await supabase.from("financeiro").insert([
      {
        mes: new Date().toLocaleDateString("pt-BR", { month:"long", year:"numeric" }),
        recebido,
        descontos: totalDescontos,
        sobra,
      },
    ]);
    if (!error) {
      alert("Mês encerrado e salvo com sucesso!");
      setDescontos([]);
      setRecebido(0);
      setGraficoData({
        labels: ["Recebido","Descontos","Sobra"],
        datasets:[{ label:"Mês Atual", data:[recebido,totalDescontos,sobra], backgroundColor:["#3b82f6","#ef4444","#10b981"] }]
      });
    }
  };

  const { totalDescontos, sobra } = calcularTotais();

  // Export CSV
  const exportarCSV = () => {
    if (!descontos.length) { alert("Não há dados para exportar!"); return; }
    const cabecalho = ["Descrição","Valor","Pago"];
    const linhas = descontos.map(d=>[d.descricao,d.valor.toFixed(2),d.pago?"Sim":"Não"]);
    const csvContent = [cabecalho,...linhas].map(e=>e.join(",")).join("\n");
    const blob = new Blob([csvContent],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download",`descontos_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório Financeiro",20,20);
    let y = 30;
    doc.text(`Recebido: R$ ${recebido.toFixed(2)}`,20,y); y+=10;
    doc.text(`Descontos Pagos: R$ ${totalDescontos.toFixed(2)}`,20,y); y+=10;
    doc.text(`Sobra: R$ ${sobra.toFixed(2)}`,20,y); y+=10;
    doc.text("Detalhes dos Descontos:",20,y); y+=10;
    descontos.forEach(d=>{
      doc.text(`${d.descricao} - R$ ${d.valor.toFixed(2)} - ${d.pago?"Pago":"Não pago"}`,20,y);
      y+=10;
    });
    doc.save(`relatorio_${new Date().toISOString()}.pdf`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className={`${styles.container} ${darkMode?styles.dark:""}`}>
      <h1 className={styles.title}>💰 Controle Financeiro</h1>

      <div style={{textAlign:"right",marginBottom:"1rem"}}>
        <button className={styles.toggleButton} onClick={()=>setDarkMode(!darkMode)}>
          {darkMode?"🌞 Modo Claro":"🌙 Modo Escuro"}
        </button>
        <button className={styles.button} onClick={handleLogout}>🔓 Sair</button>
      </div>

      <div className={styles.inputGroup}>
        <label>
          Valor Recebido:
          <input type="number" value={recebido} onChange={e=>setRecebido(parseFloat(e.target.value)||0)}/>
        </label>
      </div>

      <table className={styles.table}>
        <thead><tr><th>Descrição</th><th>Valor</th><th>Pago</th></tr></thead>
        <tbody>
          {descontos.map((d,i)=>(
            <tr key={i} className={d.pago?styles.rowPaid:styles.rowPending}>
              <td><input type="text" value={d.descricao} onChange={e=>atualizarDesconto(i,"descricao",e.target.value)}/></td>
              <td><input type="number" value={d.valor} onChange={e=>atualizarDesconto(i,"valor",e.target.value)}/></td>
              <td><input type="checkbox" checked={d.pago} onChange={e=>atualizarDesconto(i,"pago",e.target.checked)}/></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.buttonGroup}>
        <button onClick={adicionarDesconto} className={`${styles.button} ${styles.addButton}`}>➕ Adicionar Desconto</button>
        <button onClick={encerrarMes} className={`${styles.button} ${styles.saveButton}`}>✅ Encerrar Mês</button>
        <button onClick={exportarCSV} className={`${styles.button} ${styles.saveButton}`}>📄 Exportar CSV</button>
        <button onClick={exportarPDF} className={`${styles.button} ${styles.saveButton}`}>📄 Exportar PDF</button>
      </div>

      <div className={styles.totalCard}>
        <div className={`${styles.card} ${styles.cardRecebido}`}>Recebido: R$ {recebido.toFixed(2)}</div>
        <div className={`${styles.card} ${styles.cardDescontos}`}>Descontos: R$ {totalDescontos.toFixed(2)}</div>
        <div className={`${styles.card} ${styles.cardSobra}`}>Sobra: R$ {sobra.toFixed(2)}</div>
      </div>

      {graficoData && <div style={{background:"white",padding:"1rem",borderRadius:"12px"}}><Bar data={graficoData}/></div>}
    </div>
  );
}
