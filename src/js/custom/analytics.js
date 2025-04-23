import ApexCharts from 'apexcharts';


function isDark(){
  return document.querySelector('.dark') !== null;
}

function sendQuery(tp,beg,end){
  return new Promise((resolve, reject) => {
    fetch('api/viz', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          tp: tp,
          beg:beg,
          end:end
      })
    })
    .then(response => response.json())
    .then(data => resolve((data)))
    .catch(error => reject( error));
  })
}

function displayKPI(kpi,element,format,prop,beg,end){
  sendQuery(kpi,beg,end).then((data)=>{
    if(data.length>0)
      element.innerText=format.format( data[0][prop]);
    else
      element.innerText=data;
  })
  .catch((err)=>{
    element.innerText='error:'+err;
  })
}

async function displayEfficiencyMap(beg,end){
  var axisStyle={ 
    fontSize:  '14px',
    fontWeight:'500',
    color:  isDark()? '#ffffff':"#334155"
  }
  var data=await sendQuery('eff',beg,end);
  const seriesData = data.map(item => ({
    x: item.DAY,  
    y: item.EFFICIENCY  
  }));
  var options = {
    chart: {
      id:'efficiencyChart',
      height: 350,
      type: 'heatmap'
    },
    xaxis: {
      title: { 
          style: axisStyle
      }
    },
    yaxis: {
      title: { 
          style: axisStyle
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 0,
        useFillColorAsStroke: true,
        colorScale: {
          ranges: [{
            from: 0,
            to: 85,
            name: 'Low',
            color: '#FF0000'  
          },
          {
            from: 86,
            to: 94,
            name: 'Medium High',
            color: '#FF8000'  
          },
          {
            from: 94,
            to: 100,
            name: 'High',
            color: '#00FF00'
          }
        ]
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    series: [
      {
        name: '',
        data: seriesData
      }
    ],
    xaxis: {
      type: 'category',
      title: { 
        text: 'Date',
        style: {
          color: `${isDark()?'white':'black'}`
        }
      },
    },
    yaxis: {
      title: { 
        text: 'Efficiency %',
        style: {
          color: `${isDark()?'white':'black'}`
        }
      },
    }
  };
  let chart=ApexCharts.getChartByID('efficiencyChart');
  if(chart != undefined){
    chart.destroy();
  }
  new ApexCharts(document.querySelector("#efficiencyChart"), options).render().catch(()=>{
    console.log('Trying to render on missing elements (change page too fast...)')
  });;
}

function displayDownTime(beg,end){
  sendQuery('da',beg,end).then((data)=>{
    if(data.length>0){
      var options = {
        chart: { type: 'pie',id: 'downtimeChart',height:"300px"},
        legend: { position: 'bottom'},
        labels: ['Planned Downtime', 'Unplanned Downtime'],
        series: [data[0]['PLANNED_DOWNTIME_EVENTS'], data[0]['UNPLANNED_DOWNTIME_EVENTS']],
      };
      let chart=ApexCharts.getChartByID('downtimeChart');
      if(chart != undefined){
        chart.destroy();
      }
      new ApexCharts(document.querySelector("#downtimeChart"), options).render().catch(()=>{
        console.log('Trying to render on missing elements (change page too fast...)')
      });
    }
      else
        console.log("ERRR");
    })
  .catch((err)=>{
    console.log('error:'+err)
  })
}

function setPickerListener(elemID){
  const datePicker = document.getElementById(elemID);
  if(datePicker)
    datePicker.addEventListener('change', function () {
      refreshDash();
    });
}

function toUTCString(dateStr,end=false) {
  const date = `${dateStr} ${end?'23:59:59.999':'00:00:00.000'} `;
  return date;
}

function refreshDash(){
  let percent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  let number = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });
  let min=toUTCString(document.getElementById('begin').value);
  let max=toUTCString(document.getElementById('end').value,true); 
  // console.log("TRANS_MIN:"+min,"TRANS_MAX:"+max);
  displayKPI('oee',document.getElementById('kpi_oee'),percent,'OEE',min,max);
  displayKPI('oee',document.getElementById('kpi_avail'),percent,'AVAILABILITY',min,max);
  displayKPI('oee',document.getElementById('kpi_quality'),percent,'QUALITY',min,max);
  displayKPI('fpy',document.getElementById('kpi_fpy'),percent,'FIRST_PASS_YIELD',min,max);
  displayKPI('rrt',document.getElementById('kpi_rrt'),percent,'REJECT_RATE',min,max);
  displayKPI('da',document.getElementById('kpi_dap'),number,'PLANNED_DOWNTIME_EVENTS',min,max);
  displayKPI('da',document.getElementById('kpi_dau'),number,'UNPLANNED_DOWNTIME_EVENTS',min,max);
  displayEfficiencyMap(min,max);
  displayDownTime(min,max);
}

window.page1=async function(){
  fadeIn();

  function fadeIn(){
    setTimeout(() => {
        document.querySelector('.loading').style.display='block';
        document.querySelector('.loading').classList.add('show');
    }, 300);
    setTimeout(() => {
        document.querySelectorAll('.ctent').forEach(el => {
            el.style.display = 'block';
        });
        document.querySelector('.loading').style.display='none';
    }, 2500);
  } 

  setPickerListener('begin');
  setPickerListener('end');
  let raw=await sendQuery('date');
  if(raw.length>0 && raw[0].MIN_TS && raw[0].MAX_TS){
    let min=raw[0].MIN_TS;
    let max=raw[0].MAX_TS;
    const formattedMin = new Date(min).toISOString().split('T')[0];
    const formattedMax = new Date(max).toISOString().split('T')[0];
    document.getElementById('begin').value = formattedMin;
    document.getElementById('end').value = formattedMax;
    refreshDash(raw);
  }  
}
