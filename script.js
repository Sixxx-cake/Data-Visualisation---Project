const NAVY = '#1B3A5C', AMBER = '#E8973A', TEAL = '#1B7F8E';
let annualData = [], ageData = [], remotenessData = [], roadUserData = [];
let currentYear = 'all', currentStatus = 'all';
let selectedYear = null;

let q1Correct = false, q2Correct = false, q3Correct = false;
let quizCompleted = false;
const correctAnswers = {q1: "2020", q2: "17-25", q3: "went-up"};

const dataPath = "data/processed/";

Promise.all([
  d3.csv(dataPath + "annual.csv"),
  d3.csv(dataPath + "age_group.csv"),
  d3.csv(dataPath + "remoteness.csv"),
  d3.csv(dataPath + "road_user.csv")
]).then(([annual, age, remoteness, roadUser]) => {
  annualData = annual.map(d => ({ year: +d.year, first_nations: +d.first_nations, non_indigenous: +d.non_indigenous }));
  ageData = age.map(d => ({ year: +d.Year, status: d.indigenous_status, group: d.age_group, val: d.Hospitalisations === '?' ? 0 : +d.Hospitalisations }));
  remotenessData = remoteness.map(d => ({ year: +d.Year, status: d.indigenous_status, region: d.remoteness === 'Major_Cities' ? 'Major Cities' : d.remoteness, val: +d.hospitalisations }));
  roadUserData = roadUser.map(d => ({ year: +d.year, status: d.indigenous_status, type: d.road_user, val: +d.hospitalisations }));
  updateAll();
  bindEvents();
  bindQuizEvents();
}).catch(err => { 
  console.error("Data loading error:", err); 
  Promise.all([
    d3.csv("data/annual.csv"),
    d3.csv("data/age_group.csv"),
    d3.csv("data/remoteness.csv"),
    d3.csv("data/road_user.csv")
  ]).then(([annual, age, remoteness, roadUser]) => {
    annualData = annual.map(d => ({ year: +d.year, first_nations: +d.first_nations, non_indigenous: +d.non_indigenous }));
    ageData = age.map(d => ({ year: +d.Year, status: d.indigenous_status, group: d.age_group, val: d.Hospitalisations === '?' ? 0 : +d.Hospitalisations }));
    remotenessData = remoteness.map(d => ({ year: +d.Year, status: d.indigenous_status, region: d.remoteness === 'Major_Cities' ? 'Major Cities' : d.remoteness, val: +d.hospitalisations }));
    roadUserData = roadUser.map(d => ({ year: +d.year, status: d.indigenous_status, type: d.road_user, val: +d.hospitalisations }));
    updateAll();
    bindEvents();
    bindQuizEvents();
  }).catch(err2 => {
    console.error("Still error:", err2);
    document.querySelector('.dashboard').innerHTML = '<div style="color:red;padding:40px;text-align:center">Error loading data. Please check CSV files location.</div>';
  });
});

function formatNumber(n) { return n?.toLocaleString() || '—'; }
function formatK(v) { return v >= 1000 ? Math.round(v/1000)+'k' : v; }

function showTooltip(event, text) {
  const tooltip = document.getElementById('chart-tooltip');
  tooltip.style.opacity = '1';
  tooltip.style.left = (event.pageX + 15) + 'px';
  tooltip.style.top = (event.pageY - 25) + 'px';
  tooltip.innerHTML = text;
}

function hideTooltip() {
  const tooltip = document.getElementById('chart-tooltip');
  tooltip.style.opacity = '0';
}

// CHART 1

function drawLineChart() {
  const el = document.getElementById('line-chart');
  if(!el) return;
  el.innerHTML = '';
  
  const w = 500, h = 280, m = {t:25,r:35,b:35,l:45}, iw = w-m.l-m.r, ih = h-m.t-m.b;
  const svg = d3.select('#line-chart').append('svg')
    .attr('viewBox',`0 0 ${w} ${h}`)
    .append('g')
    .attr('transform',`translate(${m.l},${m.t})`);
  
  let fn = annualData.map(d=>({year:d.year,val:d.first_nations,label:'First Nations'}));
  let ni = annualData.map(d=>({year:d.year,val:d.non_indigenous,label:'Non-Indigenous'}));
  
  if(currentYear!='all'){ 
    fn = fn.filter(d=>d.year==currentYear); 
    ni = ni.filter(d=>d.year==currentYear); 
  }
  
  if(annualData.length === 0) return;
  const maxV = Math.max(d3.max(annualData,d=>d.first_nations), d3.max(annualData,d=>d.non_indigenous));
  const x = d3.scaleLinear().domain([2011,2021]).range([0,iw]);
  const y = d3.scaleLinear().domain([0,maxV*1.1]).range([ih,0]);
  
  svg.append('g').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(6));
  svg.append('g').call(d3.axisLeft(y).tickFormat(d=>formatK(d)));
  
  const line = d3.line().x(d=>x(d.year)).y(d=>y(d.val));
  
  if(currentStatus=='all'||currentStatus=='First Nations'){
    svg.append('path').datum(fn).attr('fill','none').attr('stroke',NAVY).attr('stroke-width',2.5).attr('d',line);
    svg.selectAll('.dot-fn').data(fn).enter().append('circle')
      .attr('cx',d=>x(d.year)).attr('cy',d=>y(d.val))
      .attr('r', d=> (selectedYear === d.year || d.year == currentYear) ? 10 : 5)
      .attr('fill',NAVY).attr('stroke','white').attr('stroke-width',2)
      .style('cursor','pointer')
      .on('click', function(event, d) { selectedYear = selectedYear === d.year ? null : d.year; drawLineChart(); })
      .on('mouseover', function(event, d) { showTooltip(event, `${d.label} ${d.year}: ${formatNumber(d.val)}`); d3.select(this).attr('r', 12); })
      .on('mouseout', function() { hideTooltip(); d3.select(this).attr('r', d=> (selectedYear === d.year || d.year == currentYear) ? 10 : 5); });
  }
  
  if(currentStatus=='all'||currentStatus=='Non-Indigenous'){
    svg.append('path').datum(ni).attr('fill','none').attr('stroke',AMBER).attr('stroke-width',2.5).attr('stroke-dasharray','5,5').attr('d',line);
    svg.selectAll('.dot-ni').data(ni).enter().append('circle')
      .attr('cx',d=>x(d.year)).attr('cy',d=>y(d.val))
      .attr('r', d=> (selectedYear === d.year || d.year == currentYear) ? 10 : 5)
      .attr('fill',AMBER).attr('stroke','white').attr('stroke-width',2)
      .style('cursor','pointer')
      .on('click', function(event, d) { selectedYear = selectedYear === d.year ? null : d.year; drawLineChart(); })
      .on('mouseover', function(event, d) { showTooltip(event, `${d.label} ${d.year}: ${formatNumber(d.val)}`); d3.select(this).attr('r', 12); })
      .on('mouseout', function() { hideTooltip(); d3.select(this).attr('r', d=> (selectedYear === d.year || d.year == currentYear) ? 10 : 5); });
  }
}


// CHART 2

function drawAgeChart() {
  const el = document.getElementById('age-chart');
  if(!el) return;
  el.innerHTML = '';
  
  let filtered = [...ageData];
  if(currentYear!='all') filtered = filtered.filter(d=>d.year==currentYear);
  if(currentStatus!='all') filtered = filtered.filter(d=>d.status==currentStatus);
  
  const groups = ['0-7','8-16','17-25','26-39','40-64','65+'];
  const fnVals = groups.map(g=>filtered.find(d=>d.group==g && d.status=='First Nations')?.val || 0);
  const niVals = groups.map(g=>filtered.find(d=>d.group==g && d.status=='Non-Indigenous')?.val || 0);
  
  const w=500, h=280, m={t:25,r:25,b:55,l:45}, iw=w-m.l-m.r, ih=h-m.t-m.b;
  const svg = d3.select('#age-chart').append('svg').attr('viewBox',`0 0 ${w} ${h}`).append('g').attr('transform',`translate(${m.l},${m.t})`);
  
  const x = d3.scaleBand().domain(groups).range([0,iw]).padding(0.2);
  const maxV = Math.max(d3.max(fnVals), d3.max(niVals));
  const y = d3.scaleLinear().domain([0,maxV*1.1]).range([ih,0]);
  
  svg.append('g').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x)).selectAll('text').attr('transform','rotate(-25)').style('text-anchor','end');
  svg.append('g').call(d3.axisLeft(y).tickFormat(d=>formatK(d)));
  
  const bw = x.bandwidth()/2;
  
  if(currentStatus=='all'||currentStatus=='First Nations'){
    svg.selectAll('.bar-fn').data(fnVals).enter().append('rect')
      .attr('x',(d,i)=>x(groups[i]))
      .attr('y',d=>y(d))
      .attr('width',bw)
      .attr('height',d=>ih-y(d))
      .attr('fill',NAVY)
      .attr('rx',3)
      .on('mouseover', function(event, d) { showTooltip(event, `First Nations: ${formatNumber(d)}`); d3.select(this).attr('opacity', 0.8); })
      .on('mouseout', function() { hideTooltip(); d3.select(this).attr('opacity', 1); });
  }
  
  if(currentStatus=='all'||currentStatus=='Non-Indigenous'){
    svg.selectAll('.bar-ni').data(niVals).enter().append('rect')
      .attr('x',(d,i)=>x(groups[i])+bw)
      .attr('y',d=>y(d))
      .attr('width',bw)
      .attr('height',d=>ih-y(d))
      .attr('fill',AMBER)
      .attr('rx',3)
      .on('mouseover', function(event, d) { showTooltip(event, `Non-Indigenous: ${formatNumber(d)}`); d3.select(this).attr('opacity', 0.8); })
      .on('mouseout', function() { hideTooltip(); d3.select(this).attr('opacity', 1); });
  }
}


// CHART 3

function drawStackedChart() {
  const el = document.getElementById('remoteness-chart');
  if(!el) return;
  el.innerHTML = '';
  
  let filtered = [...remotenessData];
  if(currentYear != 'all') filtered = filtered.filter(d => d.year == currentYear);
  
  const regions = ['Major Cities', 'Regional', 'Remote'];
  
  let fnVals = [];
  let niVals = [];
  
  if(currentStatus == 'all' || currentStatus == 'First Nations'){
    for(let r = 0; r < regions.length; r++){
      let sum = 0;
      for(let j = 0; j < filtered.length; j++){
        if(filtered[j].region == regions[r] && filtered[j].status == 'First Nations'){
          sum += filtered[j].val;
        }
      }
      fnVals.push(sum);
    }
  } else {
    for(let r = 0; r < regions.length; r++) fnVals.push(0);
  }
  
  if(currentStatus == 'all' || currentStatus == 'Non-Indigenous'){
    for(let r = 0; r < regions.length; r++){
      let sum = 0;
      for(let j = 0; j < filtered.length; j++){
        if(filtered[j].region == regions[r] && filtered[j].status == 'Non-Indigenous'){
          sum += filtered[j].val;
        }
      }
      niVals.push(sum);
    }
  } else {
    for(let r = 0; r < regions.length; r++) niVals.push(0);
  }
  
  const totalVals = [];
  for(let r = 0; r < regions.length; r++){
    totalVals.push(fnVals[r] + niVals[r]);
  }
  const maxVal = Math.max(...totalVals);
  if(maxVal === 0) return;
  
  const w = 500, h = 280;
  const m = {t:20, r:20, b:30, l:100};
  const iw = w - m.l - m.r;
  const ih = h - m.t - m.b;
  
  const svg = d3.select('#remoteness-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .append('g')
    .attr('transform', `translate(${m.l}, ${m.t})`);
  
  const y = d3.scaleBand().domain(regions).range([0, ih]).padding(0.3);
  const x = d3.scaleLinear().domain([0, maxVal * 1.1]).range([0, iw]);
  
  svg.append('g').call(d3.axisLeft(y));
  svg.append('g')
    .attr('transform', `translate(0, ${ih})`)
    .call(d3.axisBottom(x).tickFormat(d => formatK(d)));
  
  const barHeight = y.bandwidth();
  
  for(let r = 0; r < regions.length; r++){
    const barY = y(regions[r]);
    let currentX = 0;
    
    if(fnVals[r] > 0){
      const fnWidth = x(fnVals[r]);
      
      svg.append('rect')
        .attr('x', currentX)
        .attr('y', barY)
        .attr('width', fnWidth)
        .attr('height', barHeight)
        .attr('fill', NAVY)
        .attr('rx', 3)
        .attr('ry', 3)
        .on('mouseover', function(event) { 
          showTooltip(event, `First Nations: ${formatNumber(fnVals[r])}`); 
          d3.select(this).attr('opacity', 0.85); 
        })
        .on('mouseout', function() { 
          hideTooltip(); 
          d3.select(this).attr('opacity', 1); 
        });
      
      if(fnVals[r] > 5000){
        svg.append('text')
          .attr('x', currentX + fnWidth / 2)
          .attr('y', barY + barHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('fill', '#fff')
          .text(formatK(fnVals[r]));
      } else if(fnVals[r] > 0){
        svg.append('text')
          .attr('x', currentX + fnWidth + 5)
          .attr('y', barY + barHeight / 2)
          .attr('text-anchor', 'start')
          .attr('dy', '0.35em')
          .style('font-size', '9px')
          .style('fill', NAVY)
          .text(formatK(fnVals[r]));
      }
      
      currentX += fnWidth;
    }
    
    if(fnVals[r] > 0 && niVals[r] > 0){
      svg.append('line')
        .attr('x1', currentX)
        .attr('x2', currentX)
        .attr('y1', barY)
        .attr('y2', barY + barHeight)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
    }
    
    if(niVals[r] > 0){
      const niWidth = x(niVals[r]);
      
      svg.append('rect')
        .attr('x', currentX)
        .attr('y', barY)
        .attr('width', niWidth)
        .attr('height', barHeight)
        .attr('fill', AMBER)
        .attr('rx', 3)
        .attr('ry', 3)
        .on('mouseover', function(event) { 
          showTooltip(event, `Non-Indigenous: ${formatNumber(niVals[r])}`); 
          d3.select(this).attr('opacity', 0.85); 
        })
        .on('mouseout', function() { 
          hideTooltip(); 
          d3.select(this).attr('opacity', 1); 
        });
      
      if(niVals[r] > 5000){
        svg.append('text')
          .attr('x', currentX + niWidth / 2)
          .attr('y', barY + barHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('fill', '#fff')
          .text(formatK(niVals[r]));
      } else if(niVals[r] > 0){
        svg.append('text')
          .attr('x', currentX + niWidth + 5)
          .attr('y', barY + barHeight / 2)
          .attr('text-anchor', 'start')
          .attr('dy', '0.35em')
          .style('font-size', '9px')
          .style('fill', AMBER)
          .text(formatK(niVals[r]));
      }
      
      currentX += niWidth;
    }
    
    const totalVal = fnVals[r] + niVals[r];
    if(totalVal > 0){
      svg.append('text')
        .attr('x', currentX + 8)
        .attr('y', barY + barHeight / 2)
        .attr('text-anchor', 'start')
        .attr('dy', '0.35em')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', NAVY)
        .text(formatK(totalVal));
    }
  }
}


// CHART 4

function drawConcentricDonut() {
  const container = document.getElementById('concentric-donut-container');
  if(!container) return;
  container.innerHTML = '';
  
  const colors = [NAVY, AMBER, TEAL, '#2E7D52'];
  const labels = ['Car occupant', 'Motorcyclist', 'Pedal cyclist', 'Pedestrian'];
  const types = ['car', 'moto', 'cycle', 'ped'];
  

  let filtered = [...roadUserData];
  if(currentYear != 'all') filtered = filtered.filter(d => d.year == currentYear);
  

  let fnVals = [];
  let niVals = [];
  
  if(currentStatus == 'all' || currentStatus == 'First Nations'){
    fnVals = types.map(t => {
      const val = filtered.find(d => d.type == t && d.status == 'First Nations')?.val || 0;
      return val;
    });
  } else {
    fnVals = [0, 0, 0, 0];
  }
  
  if(currentStatus == 'all' || currentStatus == 'Non-Indigenous'){
    niVals = types.map(t => {
      const val = filtered.find(d => d.type == t && d.status == 'Non-Indigenous')?.val || 0;
      return val;
    });
  } else {
    niVals = [0, 0, 0, 0];
  }
  
  const fnTotal = fnVals.reduce((a,b) => a + b, 0);
  const niTotal = niVals.reduce((a,b) => a + b, 0);
  const grandTotal = fnTotal + niTotal;
  

  if(grandTotal === 0){
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--slate);">No data available for selected filters</div>';
    return;
  }
  
  const size = 260;
  const outerRadius = 110;
  const innerRadius1 = 65;
  const innerRadius2 = 35;
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', size)
    .attr('height', size)
    .append('g')
    .attr('transform', `translate(${size/2}, ${size/2})`);
  

  const pieOuter = d3.pie().value(d => d).sort(null);
  const arcOuter = d3.arc()
    .innerRadius(innerRadius1)
    .outerRadius(outerRadius)
    .cornerRadius(3);
  
  const outerArcs = pieOuter(niVals);
  
  svg.selectAll('.outer-slice')
    .data(outerArcs)
    .enter()
    .append('path')
    .attr('class', 'outer-slice')
    .attr('d', arcOuter)
    .attr('fill', (d, i) => colors[i % colors.length])
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('mouseover', function(event, d) {
      const pct = niTotal > 0 ? Math.round(d.data / niTotal * 100) : 0;
      const label = labels[d.index];
      showTooltip(event, `Non-Indigenous ${label}: ${formatNumber(d.data)} (${pct}%)`);
      d3.select(this).attr('opacity', 0.8);
    })
    .on('mouseout', function() {
      hideTooltip();
      d3.select(this).attr('opacity', 1);
    });
  

  const pieInner = d3.pie().value(d => d).sort(null);
  const arcInner = d3.arc()
    .innerRadius(innerRadius2)
    .outerRadius(innerRadius1 - 3)
    .cornerRadius(3);
  
  const innerArcs = pieInner(fnVals);
  
  svg.selectAll('.inner-slice')
    .data(innerArcs)
    .enter()
    .append('path')
    .attr('class', 'inner-slice')
    .attr('d', arcInner)
    .attr('fill', (d, i) => colors[i % colors.length])
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('mouseover', function(event, d) {
      const pct = fnTotal > 0 ? Math.round(d.data / fnTotal * 100) : 0;
      const label = labels[d.index];
      showTooltip(event, `First Nations ${label}: ${formatNumber(d.data)} (${pct}%)`);
      d3.select(this).attr('opacity', 0.8);
    })
    .on('mouseout', function() {
      hideTooltip();
      d3.select(this).attr('opacity', 1);
    });
  

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.5em')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('fill', NAVY)
    .text('Total');
  
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.8em')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('fill', NAVY)
    .text(formatNumber(grandTotal));
  

  const legendDiv = document.createElement('div');
  legendDiv.style.display = 'flex';
  legendDiv.style.justifyContent = 'center';
  legendDiv.style.gap = '20px';
  legendDiv.style.marginTop = '12px';
  legendDiv.style.flexWrap = 'wrap';
  
  const innerLegend = document.createElement('div');
  innerLegend.innerHTML = '<span style="display:inline-block;width:14px;height:14px;background:' + NAVY + ';border-radius:2px;margin-right:6px;"></span><span style="font-size:11px;">First Nations (Inner Ring)</span>';
  
  const outerLegend = document.createElement('div');
  outerLegend.innerHTML = '<span style="display:inline-block;width:14px;height:14px;background:' + AMBER + ';border-radius:2px;margin-right:6px;"></span><span style="font-size:11px;">Non-Indigenous (Outer Ring)</span>';
  
  legendDiv.appendChild(innerLegend);
  legendDiv.appendChild(outerLegend);
  container.appendChild(legendDiv);
  

  const colorLegend = document.createElement('div');
  colorLegend.style.display = 'flex';
  colorLegend.style.justifyContent = 'center';
  colorLegend.style.gap = '12px';
  colorLegend.style.marginTop = '12px';
  colorLegend.style.flexWrap = 'wrap';
  
  labels.forEach((label, i) => {
    const span = document.createElement('span');
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.gap = '6px';
    span.style.fontSize = '10px';
    span.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${colors[i]};border-radius:2px;"></span>${label}`;
    colorLegend.appendChild(span);
  });
  
  container.appendChild(colorLegend);
}
function updateStats() {
  let filtered = [...annualData];
  if(currentYear!='all') filtered = filtered.filter(d=>d.year==currentYear);
  const fn = filtered.reduce((s,d)=>s+d.first_nations,0);
  const ni = filtered.reduce((s,d)=>s+d.non_indigenous,0);
  document.getElementById('stTotal').textContent = formatNumber(fn+ni);
  document.getElementById('stFN').textContent = formatNumber(fn);
  document.getElementById('stNI').textContent = formatNumber(ni);
  document.getElementById('yrBadge').textContent = currentYear=='all'?'All Years':currentYear;
}

function updateAll() { 
  updateStats(); 
  drawLineChart(); 
  drawAgeChart(); 
  drawStackedChart(); 
  drawConcentricDonut(); 
}

function bindEvents() {
  document.getElementById('fYear').onchange = e => { currentYear = e.target.value; selectedYear = null; updateAll(); };
  document.getElementById('fInd').onchange = e => { currentStatus = e.target.value; selectedYear = null; updateAll(); };
  document.getElementById('resetBtn').onclick = () => {
    document.getElementById('fYear').value = 'all';
    document.getElementById('fInd').value = 'all';
    currentYear = 'all'; currentStatus = 'all';
    selectedYear = null;
    updateAll();
  };
}

function bindQuizEvents() {
  const modal = document.getElementById('quizModal');
  document.getElementById('openQuizBtn').onclick = () => { modal.style.display = 'flex'; };
  document.getElementById('closeQuizBtn').onclick = () => { modal.style.display = 'none'; };
  window.onclick = e => { if(e.target == modal) modal.style.display = 'none'; };
  
  document.getElementById('quizSubmitBtn').addEventListener('click', function() {
    const q1Selected = document.querySelector('input[name="q1"]:checked');
    const q1Feedback = document.getElementById('q1-feedback');
    if(q1Selected){
      if(q1Selected.value === correctAnswers.q1){
        q1Correct = true;
        q1Feedback.style.display = 'block';
        q1Feedback.className = 'quiz-feedback correct';
        q1Feedback.innerHTML = 'Correct! 2020 had the highest number with 2,290 hospitalisations.';
      } else {
        q1Correct = false;
        q1Feedback.style.display = 'block';
        q1Feedback.className = 'quiz-feedback wrong';
        q1Feedback.innerHTML = 'That is not correct. Hint: Look at the Annual Trends chart.';
      }
    } else {
      q1Feedback.style.display = 'block';
      q1Feedback.className = 'quiz-feedback neutral';
      q1Feedback.innerHTML = 'Please select an answer for Question 1.';
    }

    const q2Selected = document.querySelector('input[name="q2"]:checked');
    const q2Feedback = document.getElementById('q2-feedback');
    if(q2Selected){
      if(q2Selected.value === correctAnswers.q2){
        q2Correct = true;
        q2Feedback.style.display = 'block';
        q2Feedback.className = 'quiz-feedback correct';
        q2Feedback.innerHTML = 'Correct! The 17-25 age group shows the biggest gap.';
      } else {
        q2Correct = false;
        q2Feedback.style.display = 'block';
        q2Feedback.className = 'quiz-feedback wrong';
        q2Feedback.innerHTML = 'That is not correct. Hint: Look at the Age Groups chart.';
      }
    } else {
      q2Feedback.style.display = 'block';
      q2Feedback.className = 'quiz-feedback neutral';
      q2Feedback.innerHTML = 'Please select an answer for Question 2.';
    }

    const q3Selected = document.querySelector('input[name="q3"]:checked');
    const q3Feedback = document.getElementById('q3-feedback');
    if(q3Selected){
      if(q3Selected.value === correctAnswers.q3){
        q3Correct = true;
        q3Feedback.style.display = 'block';
        q3Feedback.className = 'quiz-feedback correct';
        q3Feedback.innerHTML = 'Correct! Hospitalisations increased by about 90%.';
      } else {
        q3Correct = false;
        q3Feedback.style.display = 'block';
        q3Feedback.className = 'quiz-feedback wrong';
        q3Feedback.innerHTML = 'That is not correct. Hint: Look at the Annual Trends chart.';
      }
    } else {
      q3Feedback.style.display = 'block';
      q3Feedback.className = 'quiz-feedback neutral';
      q3Feedback.innerHTML = 'Please select an answer for Question 3.';
    }

    if(q1Correct && q2Correct && q3Correct && !quizCompleted){
      quizCompleted = true;
      document.getElementById('quizOverallFeedback').innerHTML = '<div style="background:#E8F5E9; padding:12px; border-radius:8px;"><strong>Congratulations!</strong> You have correctly answered all questions! Please share your feedback below.</div>';
      document.getElementById('feedbackSection').style.display = 'block';
    }
  });

  document.getElementById('feedbackSubmitBtn').addEventListener('click', function(){
    const feedback = document.getElementById('userFeedback').value.trim();
    const msgDiv = document.getElementById('feedbackMessage');
    if(feedback){
      msgDiv.innerHTML = 'Thank you for your feedback! We appreciate your input.';
      msgDiv.style.color = 'var(--green)';
      document.getElementById('userFeedback').value = '';
      console.log('User feedback:', feedback);
    } else {
      msgDiv.innerHTML = 'Please enter your feedback before submitting.';
      msgDiv.style.color = 'var(--red)';
    }
  });
}