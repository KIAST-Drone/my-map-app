// js/app.js

let overlays = [];
let placeMode = null;
let currentCircle = null;

// DMS 문자열(예: "36°21′22″N127°20′51″E")을 {lat, lng} 십진수로 반환
function parseDMS(input) {
  const parts = input.match(
    /(\d+)[°\s]+(\d+)[′']+(\d+)(?:[″"])?([NS])\s*(\d+)[°\s]+(\d+)[′']+(\d+)(?:[″"])?([EW])/i
  );
  if (!parts) return null;
  const d1 = +parts[1], m1 = +parts[2], s1 = +parts[3], dir1 = parts[4].toUpperCase();
  const d2 = +parts[5], m2 = +parts[6], s2 = +parts[7], dir2 = parts[8].toUpperCase();
  const lat = (d1 + m1 / 60 + s1 / 3600) * (dir1 === 'S' ? -1 : 1);
  const lng = (d2 + m2 / 60 + s2 / 3600) * (dir2 === 'W' ? -1 : 1);
  return { lat, lng };
}

document.addEventListener('DOMContentLoaded', () => {
  // 결과 표시용 요소
  const controls = document.getElementById('controls');
  const resultDiv = document.createElement('div');
  resultDiv.id = 'searchResult';
  resultDiv.style.marginTop = '8px';
  resultDiv.style.fontSize = '13px';
  resultDiv.style.color = '#333';
  controls.appendChild(resultDiv);

  const geocoder = new google.maps.Geocoder();

  // --- 비행구역 생성 (주소/좌표 입력) ---
  document.getElementById('drawCircle').addEventListener('click', () => {
    const input = document.getElementById('address').value.trim();
    const rad   = parseFloat(document.getElementById('radius').value);
    if (!input || isNaN(rad)) {
      return alert('주소(또는 위도,경도)와 반경(m)을 올바르게 입력하세요.');
    }

    // 1) DMS 형태인지 검사
    const dms = parseDMS(input);
    if (dms) {
      geocoder.geocode({ location: dms }, handleResult);
      return;
    }

    // 2) 십진수 좌표 형태인지 검사 (예: "37.5665,126.9780")
    const coordMatch = input.match(
      /^\s*([+-]?\d+(\.\d+)?)\s*,\s*([+-]?\d+(\.\d+)?)\s*$/
    );
    if (coordMatch) {
      geocoder.geocode(
        { location: { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[3]) } },
        handleResult
      );
      return;
    }

    // 3) 일반 주소
    geocoder.geocode({ address: input }, handleResult);

    function handleResult(results, status) {
      if (status === 'OK' && results[0]) {
        const loc       = results[0].geometry.location;
        const formatted = results[0].formatted_address;

        // 이전 원 제거
        if (currentCircle) {
          currentCircle.setMap(null);
          overlays = overlays.filter(o => o !== currentCircle);
        }

        // 새 원 생성 (클릭 이벤트 투과)
        currentCircle = new google.maps.Circle({
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
        overlays.push(currentCircle);

        // 뷰포트 조정
        map.fitBounds(currentCircle.getBounds());

        // 검색된 주소 표시
        resultDiv.textContent = `검색된 위치: ${formatted}`;
      } else {
        alert('위치 정보를 찾을 수 없습니다: ' + status);
      }
    }
  });

  // --- 툴바 클릭 이벤트 (위치표시/경로/undo/clearAll) ---
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
      currentCircle = null;
      drawingManager.setDrawingMode(null);
      resultDiv.textContent = '';
      return;
    }
  });

  // --- 지도 클릭 (위치표시) ---
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

  // --- 경로 그리기 완료 이벤트 ---
  google.maps.event.addListener(drawingManager, 'overlaycomplete', e => {
    drawingManager.setDrawingMode(null);
    map.setOptions({ draggableCursor: null });
    overlays.push(e.overlay);
  });

  // --- ESC 키로 선 그리기 모드 종료 ---
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawingManager.getDrawingMode() === google.maps.drawing.OverlayType.POLYLINE) {
      drawingManager.setDrawingMode(null);
      map.setOptions({ draggableCursor: null });
    }
  });
});
