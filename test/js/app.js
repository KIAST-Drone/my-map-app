// js/map-config.js

let map;
let drawingManager;
let overlays = [];
let placeMode = null;


function initMap() {
  // 1) 지도 초기화
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 37.5665, lng: 126.9780 },
    zoom: 12,
    mapTypeId: 'satellite',
    zoomControl: true
  });

  // 2) DrawingManager 설정 (경로 전용)
  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: false,
    polylineOptions: {
      strokeColor: '#FF0000', strokeWeight: 5,
      icons:[{ icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:4},offset:'0%',repeat:'30px' }]
    },
    circleOptions: {
      strokeColor: '#800080', strokeOpacity: 0.8, strokeWeight: 2,
      fillColor: '#800080', fillOpacity: 0.35, clickable: false
    },
    map: map
  });

  const geocoder = new google.maps.Geocoder();

  // 3) 검색 결과 표시 div
  const resultDiv = document.getElementById('searchResult');

  // 4) 비행구역 생성 (주소/좌표/DMS)
  document.getElementById('drawCircle').addEventListener('click', () => {
    const input = document.getElementById('address').value.trim();
    const rad   = parseFloat(document.getElementById('radius').value);
    if (!input || isNaN(rad)) {
      return alert('주소(또는 위도,경도)와 반경(m)을 모두 입력하세요.');
    }

    const dms = parseDMS(input);
    if (dms) {
      geocoder.geocode({ location: dms }, handle);
      return;
    }
    const coord = input.match(/^\s*([+-]?\d+(\.\d+)?)\s*,\s*([+-]?\d+(\.\d+)?)\s*$/);
    if (coord) {
      geocoder.geocode({ location:{lat:+coord[1],lng:+coord[3]} }, handle);
      return;
    }
    geocoder.geocode({ address: input }, handle);

    function handle(results, status) {
      if (status==='OK'&&results[0]) {
        const loc = results[0].geometry.location;
        const addr = results[0].formatted_address;
        const circle = new google.maps.Circle({
          map, center: loc, radius: rad,
          strokeColor:'#800080',strokeOpacity:0.8,strokeWeight:2,
          fillColor:'#800080',fillOpacity:0.35,clickable:false
        });
        overlays.push(circle);
        map.fitBounds(circle.getBounds());
        resultDiv.textContent = `검색된 위치: ${addr}`;
      } else {
        alert('위치 정보를 찾을 수 없습니다: '+status);
      }
    }
  });

  // 5) 툴바 클릭 (조종자/관찰자/이착륙장/경로/undo/clearAll)
  document.getElementById('toolbar').addEventListener('click', e => {
    const btn = e.target;
    if (btn.dataset.type) {
      placeMode=btn.dataset.type;
      drawingManager.setDrawingMode(null);
      map.setOptions({ draggableCursor:'crosshair' });
      return;
    }
    if (btn.dataset.mode==='polyline') {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
      map.setOptions({ draggableCursor:'crosshair' });
      return;
    }
    if (btn.id==='undo') {
      const last=overlays.pop(); if(last) (last.setMap?last.setMap(null):last.close());
      return;
    }
    if (btn.id==='clearAll') {
      overlays.forEach(o=>o.setMap?o.setMap(null):o.close());
      overlays=[]; resultDiv.textContent='';
      drawingManager.setDrawingMode(null);
      return;
    }
  });

  // 6) 지도 클릭 (위치표시)
  map.addListener('click', e => {
    if (!placeMode) return;
    const cols={pilot:'#FFD700',observer:'#90EE90',vertiport:'#87CEFA'};
    const labs={pilot:'조종자',observer:'관찰자',vertiport:'이착륙장'};
    const m=new google.maps.Marker({
      position:e.latLng,map,
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:6,fillColor:cols[placeMode],fillOpacity:1,strokeWeight:1}
    });
    const iw=new google.maps.InfoWindow({
      content:`<div style="font-size:12px;font-weight:bold;">${labs[placeMode]}</div>`,
      pixelOffset:new google.maps.Size(0,-10),maxWidth:80
    });
    iw.open(map,m);
    overlays.push(m,iw);
    placeMode=null;
    map.setOptions({ draggableCursor:null });
  });

  // 7) 경로 그리기 완료 이벤트
  google.maps.event.addListener(drawingManager,'overlaycomplete',e=>{
    drawingManager.setDrawingMode(null);
    map.setOptions({ draggableCursor:null });
    overlays.push(e.overlay);
  });

  // 8) ESC 키로 선 그리기 모드 종료
  document.addEventListener('keydown', e => {
    if (e.key==='Escape' && drawingManager.getDrawingMode()===google.maps.drawing.OverlayType.POLYLINE) {
      drawingManager.setDrawingMode(null);
      map.setOptions({ draggableCursor:null });
    }
  });
}
