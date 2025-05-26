// js/map-config.js

let map;
let drawingManager;
let overlays = [];
let placeMode = null;

// DMS 문자열(예: "37° 35′ 33″ N 126° 42′ 49″ E")을 {lat, lng} 십진수로 반환
function parseDMS(input) {
  const parts = input.match(
    /(\d+)\s*°\s*(\d+)\s*[′']\s*(\d+)\s*[″"]\s*([NS])\s+(\d+)\s*°\s*(\d+)\s*[′']\s*(\d+)\s*[″"]\s*([EW])/i
  );
  if (!parts) return null;
  const [, D1, M1, S1, dir1, D2, M2, S2, dir2] = parts;
  const lat = (+D1 + +M1/60 + +S1/3600) * (dir1.toUpperCase() === 'S' ? -1 : 1);
  const lng = (+D2 + +M2/60 + +S2/3600) * (dir2.toUpperCase() === 'W' ? -1 : 1);
  return { lat, lng };
}

function initMap() {
  // 1) 지도 초기화
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 37.5665, lng: 126.9780 },
    zoom: 12,
    mapTypeId: 'satellite',
    zoomControl: true
  });

  // 2) DrawingManager 초기화 (경로 전용)
  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: false,
    polylineOptions: {
      strokeColor: '#FF0000',
      strokeWeight: 5,
      icons: [{
        icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4 },
        offset: '0%',
        repeat: '30px'
      }]
    },
    circleOptions: {
      strokeColor: '#800080',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#800080',
      fillOpacity: 0.35,
      clickable: false
    },
    map: map
  });

  const geocoder = new google.maps.Geocoder();

  // 3) 검색 결과 표시용 요소 추가
  const controls = document.getElementById('controls');
  const resultDiv = document.createElement('div');
  resultDiv.id = 'searchResult';
  resultDiv.style.marginTop = '8px';
  resultDiv.style.fontSize = '13px';
  resultDiv.style.color = '#333';
  controls.appendChild(resultDiv);

  // 4) 비행구역 생성 버튼 핸들러
  document.getElementById('drawCircle').addEventListener('click', () => {
    const input = document.getElementById('address').value.trim();
    const rad   = parseFloat(document.getElementById('radius').value);
    if (!input || isNaN(rad)) {
      return alert('주소(또는 위도,경도)와 반경(m)을 모두 입력하세요.');
    }

    // DMS 우선 검사
    const dms = parseDMS(input);
    if (dms) {
      geocoder.geocode({ location: dms }, handleResult);
      return;
    }

    // 십진수 좌표 검사
    const coord = input.match(/^\s*([+-]?\d+(\.\d+)?)\s*,\s*([+-]?\d+(\.\d+)?)\s*$/);
    if (coord) {
      geocoder.geocode(
        { location: { lat: +coord[1], lng: +coord[3] } },
        handleResult
      );
      return;
    }

    // 일반 주소
    geocoder.geocode({ address: input }, handleResult);

    function handleResult(results, status) {
      if (status === 'OK' && results[0]) {
        const loc       = results[0].geometry.location;
        const formatted = results[0].formatted_address;

        // 새 원 생성 (과거 원들은 그대로 유지)
        const circle = new google.maps.Circle({
          map,
          center: loc,
          radius: rad,
          strokeColor: '#800080',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#800080',
          fillOpacity: 0.35,
          clickable: false
        });
        overlays.push(circle);

        // 뷰포트 자동 조정
        map.fitBounds(circle.getBounds());

        // 결과 주소 표시
        resultDiv.textContent = `검색된 위치: ${formatted}`;
      } else {
        alert('위치 정보를 찾을 수 없습니다: ' + status);
      }
    }
  });

  // 5) 툴바 클릭 이벤트 (조종자/관찰자/이착륙장/경로/undo/clearAll)
  document.getElementById('toolbar').addEventListener('click', e => {
    const btn = e.target;

    // 위치표시 모드
    if (btn.dataset.type) {
      placeMode = btn.dataset.type;
      drawingManager.setDrawingMode(null);
      map.setOptions({ draggableCursor: 'crosshair' });
      return;
    }

    // 경로 그리기 모드
    if (btn.dataset.mode === 'polyline') {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
      map.setOptions({ draggableCursor: 'crosshair' });
      return;
    }

    // undo
    if (btn.id === 'undo') {
      const last = overlays.pop();
      if (!last) return;
      if (last.setMap) last.setMap(null);
      else if (last.close) last.close();
      return;
    }

    // clearAll
    if (btn.id === 'clearAll') {
      overlays.forEach(o => {
        if (o.setMap) o.setMap(null);
        else if (o.close) o.close();
      });
      overlays = [];
      resultDiv.textContent = '';
      drawingManager.setDrawingMode(null);
      return;
    }
  });

  // 6) 지도 클릭 이벤트 (위치표시)
  map.addListener('click', e => {
    if (!placeMode) return;
    const colors = { pilot: '#FFD700', observer: '#90EE90', vertiport: '#87CEFA' };
    const labels = { pilot: '조종자', observer: '관찰자', vertiport: '이착륙장' };
    const marker = new google.maps.Marker({
      position: e.latLng,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: colors[placeMode],
        fillOpacity: 1,
        strokeWeight: 1
      }
    });
    const infow = new google.maps.InfoWindow({
      content: `<div style="font-size:12px;font-weight:bold;">${labels[placeMode]}</div>`,
      pixelOffset: new google.maps.Size(0, -10),
      maxWidth: 80
    });
    infow.open(map, marker);
    overlays.push(marker, infow);
    placeMode = null;
    map.setOptions({ draggableCursor: null });
  });

  // 7) 경로 그리기 완료 이벤트
  google.maps.event.addListener(drawingManager, 'overlaycomplete', e => {
    drawingManager.setDrawingMode(null);
    map.setOptions({ draggableCursor: null });
    overlays.push(e.overlay);
  });

  // 8) ESC 키로 선 그리기 모드 종료
  document.addEventListener('keydown', e => {
    if (
      e.key === 'Escape' &&
      drawingManager.getDrawingMode() === google.maps.drawing.OverlayType.POLYLINE
    ) {
      drawingManager.setDrawingMode(null);
      map.setOptions({ draggableCursor: null });
    }
  });
}
