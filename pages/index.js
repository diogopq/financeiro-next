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

  const atualizarTotais = () => {};

  const carregarUltimoMes = async () => {
    const { data } = await supabase.from('meses').select('*').order('id',{ascending:false}).limit(1);
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

  const adicionarLinha = () => setDescontos([...descontos, {descricao:'', valor:0, pago:false}]);

  const encerrarMes = async () => {
    const descontoDescricao = descontos.map(d=>d.descricao);
    const descontoValor = descontos.map(d=>d.valor);
    const descontoPago = descontos.map(d=>d.pago);
    await supabase.from('meses').insert([{
      mes,
      valor_recebido: valorRecebido,
      desconto_descricao: descontoDescricao,
      desconto_valor: descontoValor,
      desconto_pago: descontoPago
    }]);
    alert('Mês salvo no Supabase!');
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
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-md mt-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Controle Financeiro Online</h1>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex flex-col">
          Mês:
          <input type="month" value={mes} onChange={e=>setMes(e.target.value)} className="border p-2 rounded"/>
        </label>
        <label className="flex flex-col">
          Valor Recebido (R$):
          <input type="number" value={valorRecebido} onChange={e=>setValorRecebido(parseFloat(e.target.value)||0)} className="border p-2 rounded"/>
        </label>
      </div>

      <table className="w-full border border-gray-300 mb-4">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Descrição</th>
            <th className="border p-2">Valor</th>
            <th className="border p-2">Pago</th>
          </tr>
        </thead>
        <tbody>
          {descontos.map((d,i)=>(
            <tr key={i} className={d.pago && d.valor>0 ? 'bg-green-100' : (!d.pago && d.valor>0 ? 'bg-red-100' : '')}>
              <td className="border p-2"><input type="text" value={d.descricao} onChange={e=>handleDescontoChange(i,'descricao',e.target.value)} className="w-full p-1 border rounded"/></td>
              <td className="border p-2"><input type="number" value={d.valor} onChange={e=>handleDescontoChange(i,'valor',e.target.value)} className="w-full p-1 border rounded"/></td>
              <td className="border p-2 text-center"><input type="checkbox" checked={d.pago} onChange={e=>handleDescontoChange(i,'pago',e.target.checked)} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-4 mb-4">
        <button onClick={adicionarLinha} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Adicionar Desconto</button>
        <button onClick={encerrarMes} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Encerrar Mês</button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Totalizadores</h2>
        <p>Recebido: R$ {valorRecebido.toFixed(2)}</p>
        <p>Descontos Pagos: R$ {totalDescontos.toFixed(2)}</p>
        <p>Sobra: R$ {sobra.toFixed(2)}</p>
      </div>

      <h2 className="text-xl font-semibold mb-2">Gráfico Mensal</h2>
      <canvas ref={chartRef}></canvas>
    </div>
  )
}
