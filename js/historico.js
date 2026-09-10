const MATERIAIS = [
  { id: 'papel',      nome: 'Papel e papelão', pontosPorItem: 5 },
  { id: 'plastico',   nome: 'Plástico',        pontosPorItem: 8 },
  { id: 'vidro',      nome: 'Vidro',           pontosPorItem: 6 },
  { id: 'metal',      nome: 'Metal',           pontosPorItem: 10 },
  { id: 'eletronico', nome: 'Eletrônico',      pontosPorItem: 25 },
  { id: 'oleo',       nome: 'Óleo de cozinha',  pontosPorItem: 12 }
];

const CHAVE_STORAGE = 'historico_reciclagem';
let itensAbertos = new Set(); // ids expandidos, para manter o estado ao re-renderizar

function carregarHistorico(){
  try { return JSON.parse(localStorage.getItem(CHAVE_STORAGE)) || []; }
  catch(e) { return []; }
}
function salvarHistorico(historico){
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(historico));
}
function nomeMaterial(id){
  const m = MATERIAIS.find(x => x.id === id);
  return m ? m.nome : id;
}
function formatarData(iso){
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function registrarEntrega(materialId, quantidade){
  const material = MATERIAIS.find(m => m.id === materialId);
  if (!material || !quantidade || quantidade < 1) return;
  const pontos = quantidade * material.pontosPorItem;
  const historico = carregarHistorico();
  historico.push({
    id: 'h_' + Date.now(), tipo: 'ganho',
    data: new Date().toISOString().slice(0, 10),
    material: materialId, quantidade, pontosPorItem: material.pontosPorItem, pontos
  });
  salvarHistorico(historico);
  renderHistorico();
}

function resgatarPontos(descricao, pontos){
  if (!descricao || !pontos || pontos < 1) return;
  const historico = carregarHistorico();
  const saldoAtual = calcularResumo(historico).saldo;
  if (pontos > saldoAtual) { alert('Saldo insuficiente para esse resgate.'); return; }
  historico.push({
    id: 'h_' + Date.now(), tipo: 'resgate',
    data: new Date().toISOString().slice(0, 10), descricao, pontos: -pontos
  });
  salvarHistorico(historico);
  renderHistorico();
}

function calcularResumo(historico){
  const totalGanho = historico.filter(h => h.tipo === 'ganho').reduce((s, h) => s + h.pontos, 0);
  const totalResgatado = historico.filter(h => h.tipo === 'resgate').reduce((s, h) => s + Math.abs(h.pontos), 0);
  const totalItens = historico.filter(h => h.tipo === 'ganho').reduce((s, h) => s + h.quantidade, 0);
  return { totalGanho, totalResgatado, totalItens, saldo: totalGanho - totalResgatado };
}

// Calcula o saldo acumulado após cada evento, em ordem cronológica
function comSaldoAcumulado(historico){
  const ordemCronologica = historico.slice().sort((a, b) => new Date(a.data) - new Date(b.data));
  let saldo = 0;
  const mapa = {};
  ordemCronologica.forEach(h => { saldo += h.pontos; mapa[h.id] = saldo; });
  return mapa;
}

function aplicarFiltros(historico){
  const tipo = document.getElementById('filtro-tipo').value;
  const periodo = document.getElementById('filtro-periodo').value;
  const agora = new Date();

  return historico.filter(h => {
    if (tipo !== 'todos' && h.tipo !== tipo) return false;
    if (periodo !== 'todos') {
      const data = new Date(h.data);
      if (periodo === '7' || periodo === '30') {
        const dias = (agora - data) / (1000 * 60 * 60 * 24);
        if (dias > parseInt(periodo, 10)) return false;
      } else if (periodo === 'mes') {
        if (data.getMonth() !== agora.getMonth() || data.getFullYear() !== agora.getFullYear()) return false;
      }
    }
    return true;
  });
}

function renderHistorico(){
  const historicoCompleto = carregarHistorico();
  const resumo = calcularResumo(historicoCompleto);
  const saldoPorId = comSaldoAcumulado(historicoCompleto);

  document.getElementById('resumo-ganho').textContent = '+' + resumo.totalGanho.toLocaleString('pt-BR');
  document.getElementById('resumo-resgatado').textContent = '−' + resumo.totalResgatado.toLocaleString('pt-BR');
  document.getElementById('resumo-itens').textContent = resumo.totalItens;
  document.getElementById('resumo-saldo').textContent = resumo.saldo.toLocaleString('pt-BR');

  const historico = aplicarFiltros(historicoCompleto).sort((a, b) => new Date(b.data) - new Date(a.data));
  const lista = document.getElementById('historico-lista');

  if (historico.length === 0) {
    lista.innerHTML = '<div class="historico-vazio">Nenhuma movimentação encontrada para esse filtro.</div>';
    return;
  }

  lista.innerHTML = historico.map(h => {
    const aberto = itensAbertos.has(h.id) ? 'aberto' : '';
    const saldoApos = saldoPorId[h.id];

    if (h.tipo === 'ganho') {
      return `
        <div class="historico-item ${aberto}" data-id="${h.id}">
          <div class="historico-linha">
            <div class="historico-icone ganho">↑</div>
            <div class="historico-corpo">
              <div class="historico-desc">${h.quantidade}× ${nomeMaterial(h.material)} entregue</div>
              <div class="historico-data">${formatarData(h.data)}</div>
            </div>
            <div class="historico-pontos positivo">+${h.pontos.toLocaleString('pt-BR')} pts</div>
            <span class="historico-seta">▾</span>
          </div>
          <div class="historico-detalhes">
            <dl>
              <dt>Material</dt><dd>${nomeMaterial(h.material)}</dd>
              <dt>Quantidade</dt><dd>${h.quantidade} item(ns)</dd>
              <dt>Pontos por item</dt><dd>${h.pontosPorItem} pts</dd>
              <dt>Total ganho</dt><dd>+${h.pontos.toLocaleString('pt-BR')} pts</dd>
              <dt>Saldo após</dt><dd>${saldoApos.toLocaleString('pt-BR')} pts</dd>
            </dl>
          </div>
        </div>`;
    }

    return `
      <div class="historico-item ${aberto}" data-id="${h.id}">
        <div class="historico-linha">
          <div class="historico-icone resgate">↓</div>
          <div class="historico-corpo">
            <div class="historico-desc">${h.descricao}</div>
            <div class="historico-data">${formatarData(h.data)}</div>
          </div>
          <div class="historico-pontos negativo">−${Math.abs(h.pontos).toLocaleString('pt-BR')} pts</div>
          <span class="historico-seta">▾</span>
        </div>
        <div class="historico-detalhes">
          <dl>
            <dt>Resgate</dt><dd>${h.descricao}</dd>
            <dt>Pontos usados</dt><dd>−${Math.abs(h.pontos).toLocaleString('pt-BR')} pts</dd>
            <dt>Saldo após</dt><dd>${saldoApos.toLocaleString('pt-BR')} pts</dd>
          </dl>
        </div>
      </div>`;
  }).join('');

  // Expandir/recolher detalhes ao clicar na linha
  lista.querySelectorAll('.historico-linha').forEach(linha => {
    linha.addEventListener('click', () => {
      const item = linha.closest('.historico-item');
      const id = item.getAttribute('data-id');
      item.classList.toggle('aberto');
      if (item.classList.contains('aberto')) itensAbertos.add(id);
      else itensAbertos.delete(id);
    });
  });
}

document.getElementById('filtro-tipo').addEventListener('change', renderHistorico);
document.getElementById('filtro-periodo').addEventListener('change', renderHistorico);

document.getElementById('btn-registrar-entrega').addEventListener('click', () => {
  const opcoes = MATERIAIS.map(m => `${m.id} (${m.nome})`).join(', ');
  const materialId = prompt('Material entregue — opções: ' + opcoes);
  if (!materialId) return;
  const quantidade = parseInt(prompt('Quantidade de itens:'), 10);
  registrarEntrega(materialId, quantidade);
});

document.getElementById('btn-resgatar-pontos').addEventListener('click', () => {
  const descricao = prompt('O que você está resgatando?');
  if (!descricao) return;
  const pontos = parseInt(prompt('Quantos pontos resgatar?'), 10);
  resgatarPontos(descricao, pontos);
});

renderHistorico();