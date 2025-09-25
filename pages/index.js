import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Chart, BarElement, CategoryScale, LinearScale } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [mes, setMes] = useState('');
  const [valorRecebido, setValorRecebido] = useState(0);
  const [descontos, setDescontos] = useState([{ descricao:'', valor:0, pago:false }]);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);

  useEffect(() => {
    setMes(new Date().toISOString().slice(0,7));
    carregarUltimoMes();
  }, []);

  useEffect(() => {
    atualizarTotais();
  }, [descontos, valorRecebido]);

  const atualizarTotais = () => {
    // força re-render para atualizar cores no JSX
  };

  const carregarUltimoMes = async () => {
    const { data, error } = await supabase.from('meses').select('*').order('id',{ascending:false}).limit(1);
    if(data && data.length>0){
      const ultimo = data[0];
      const desc = ultimo.desconto_descricao || [];
      const val = ultimo.desconto_valor || [];
      let arr = [];
      for(let i=0;i<desc.length;i++){
        arr.push({descricao:desc[i], valor:val[i], pago:false});
      }
      setDescontos(arr);
    }
  };

  const handleDescontoChange = (index, field, value) => {
    const novo = [...descontos];
    novo[index][field] = field==='pago' ? value : parseFloat(value) || 0;
    setDescontos(novo);
  };

  const adicionarLinha = () => {
    setDescontos([...descontos, {descricao:'', valor:0, pago:false}]);
  };

  const encerrarMes = async () => {
    const descontoDescricao = descontos.map(d=>d.descricao);
    const descontoValor = descontos.map(d=>d.valor);
    const descontoPago = descontos.map(d=>d.pago);

    const { data, error } = await supabase.from('meses').insert([{
      mes,
      valor_recebido: valorRecebido,
      desconto_descricao: descontoDescricao,
      desconto_valor: descontoValor,
      desconto_pago: descontoPago
    }]);
    if(error) console.error(error);
    else alert('Mês salvo no Supabase!');
    mostrarGrafico();
  };

  const mostrarGrafico = () => {
    const totalDescontos = descontos.reduce((sum,d)=> d.pago ? sum+d.valor : sum,0);
    const sobra = valorRecebido - totalDescontos;

    const ctx = chartRef.current.getContext('2d');
    if(chartInstance) chartInstance.destroy();
    const newChart = new Chart(ctx,{
      type:'bar',
      data:{
        labels:['Recebido','Descontos Pagos','Sobra'],
        datasets:[{
          label:`Mês ${mes}`,
          data:[valorRecebido, totalDescontos, sobra],
          backgroundColor:['#4a76a8','#f35b5b','#28a745']
        }]
      },
      options:{ responsive:true }
    });
    setChartInstance(newChart);
  };

  const totalDescontos = descontos.reduce((sum,d)=> d.pago ? sum+d.valor : sum,0);
  const sobra = valorRecebido - totalDescontos;

  return (
    <div style={{maxWidth:'950px', margin:'auto', padding:'20px'}}>
      <h1>Controle Financeiro Online</h1>
      <label>Mês: <input type="month" value={mes} onChange={e=>setMes(e.target.value)} /></label><br/><br/>
      <label>Valor Recebido: R$ <input type="number" value={valorRecebido} onChange={e=>setValorRecebido(parseFloat(e.target.value)||0)} /></label>
      <table style={{width:'100%', borderCollapse:'collapse', marginTop:'15px'}}>
        <thead>
          <tr>
            <th>Descrição</th><th>Valor</th><th>Pago</th>
          </tr>
        </thead>
        <tbody>
          {descontos.map((d,i)=>(
            <tr key={i} style={{backgroundColor:d.pago && d.valor>0 ? '#d4edda' : (!d.pago && d.valor>0 ? '#f8d7da' : 'transparent')}}>
              <td><input type="text" value={d.descricao} onChange={e=>handleDescontoChange(i,'descricao',e.target.value)} /></td>
              <td><input type="number" value={d.valor} onChange={e=>handleDescontoChange(i,'valor',e.target.value)} /></td>
              <td><input type="checkbox" checked={d.pago} onChange={e=>handleDescontoChange(i,'pago',e.target.checked)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={adicionarLinha}>Adicionar Desconto</button>
      <h2>Totalizadores</h2>
      <p>Recebido: R$ {valorRecebido.toFixed(2)}</p>
      <p>Descontos Pagos: R$ {totalDescontos.toFixed(2)}</p>
      <p>Sobra: R$ {sobra.toFixed(2)}</p>
      <button onClick={encerrarMes}>Encerrar Mês e Salvar Online</button>
      <h2>Gráfico Mensal</h2>
      <canvas ref={chartRef}></canvas>
    </div>
  )
}
