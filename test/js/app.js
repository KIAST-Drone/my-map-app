// js/app.js

let overlays = [];
let placeMode = null;
let currentCircle = null;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  const geocoder = new google.maps.Geocoder();

  // --- 반경 원 그리기 (기존 오버레이는 유지) ---
  document.getElementById('drawCircle').addEventListener('click', () => {
    const addr = document.getElementById('address').value;
    const rad  = parseFloat(document.getElementById('radius').value);
    if (!addr || isNaN(rad)) {
      return alert('주소와 반경(m)을 올바르게 입력하세요.');
    }
    geocoder.geocode({ address: addr }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        // 이전 원만 제거
        if (currentCircle) {
          currentCircle.setMap(null);
          overlays = overlays.filter(o => o !== currentCircle);
        }
        // 새 원 (클릭 비허용)
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
        map.fitBounds(currentCircle.getBounds());
      } else {
        alert('주소를 찾을 수 없습니다: ' + status);
      }
    });
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
      return;
    }
  });

  // --- 지도 클릭 (위치표시) ---
  map.addListener('click', e => {
    if (!placeMode) return;
    const colors = {
      pilot: '#FFD700',
      observer: '#90EE90',
      vertiport: '#87CEFA'
    };
    const labels = {
      pilot: '조종자',
      observer: '관찰자',
      vertiport: '이착륙장'
    };
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

  // --- 경로 그리기 완료 ---
  google.maps.event.addListener(drawingManager, 'overlaycomplete', e => {
    drawingManager.setDrawingMode(null);
    map.setOptions({ draggableCursor: null });
    overlays.push(e.overlay);
  });
});

// js/app.js 하단에 추가
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawingManager.getDrawingMode() === google.maps.drawing.OverlayType.POLYLINE) {
    // 그리기 모드 종료 → 현재까지 그려진 폴리라인이 그대로 남습니다
    drawingManager.setDrawingMode(null);
    map.setOptions({ draggableCursor: null });
  }
});
