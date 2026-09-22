function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBasketballCourt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeRect(20, 20, w - 40, h - 40);
  const baselineY = h - 20;
  const centerX = w / 2;
  const laneWidth = 130;
  const laneHeight = 150;

  ctx.strokeRect(centerX - laneWidth / 2, baselineY - laneHeight, laneWidth, laneHeight);

  ctx.beginPath();
  ctx.arc(centerX, baselineY - laneHeight, 55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, baselineY - 10, 220, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 30, baselineY - 30);
  ctx.lineTo(centerX + 30, baselineY - 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, baselineY - 40, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSoccerField(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.beginPath();
  ctx.moveTo(20, h / 2);
  ctx.lineTo(w - 20, h / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
  ctx.stroke();

  const boxW = 220;
  const boxH = 70;
  ctx.strokeRect(w / 2 - boxW / 2, 20, boxW, boxH);
  ctx.strokeRect(w / 2 - boxW / 2, h - 20 - boxH, boxW, boxH);

  const gW = 100;
  const gH = 28;
  ctx.strokeRect(w / 2 - gW / 2, 20, gW, gH);
  ctx.strokeRect(w / 2 - gW / 2, h - 20 - gH, gW, gH);
}

function drawFootballField(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeRect(20, 20, w - 40, h - 40);
  const segments = 6;
  for (let i = 1; i < segments; i++) {
    const x = 20 + ((w - 40) / segments) * i;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, h - 20);
    ctx.stroke();
  }
}

function drawBaseballDiamond(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h - 70;
  const size = 110;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + size, cy - size);
  ctx.lineTo(cx, cy - size * 2);
  ctx.lineTo(cx - size, cy - size);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, size * 2.4, Math.PI * 1.28, Math.PI * 1.72);
  ctx.stroke();
}

function drawHockeyRink(ctx: CanvasRenderingContext2D, w: number, h: number) {
  roundRect(ctx, 20, 20, w - 40, h - 40, 40);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, h / 2);
  ctx.lineTo(w - 20, h / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
  ctx.stroke();

  for (const fx of [0.28, 0.72]) {
    for (const fy of [0.25, 0.75]) {
      ctx.beginPath();
      ctx.arc(w * fx, h * fy, 35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawVolleyballCourt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(20, h / 2);
  ctx.lineTo(w - 20, h / 2);
  ctx.stroke();
  ctx.lineWidth = 2;

  const q = (h - 40) / 3;
  ctx.beginPath();
  ctx.moveTo(20, h / 2 - q);
  ctx.lineTo(w - 20, h / 2 - q);
  ctx.moveTo(20, h / 2 + q);
  ctx.lineTo(w - 20, h / 2 + q);
  ctx.stroke();
}

function drawBlankBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeRect(20, 20, w - 40, h - 40);
}

export function drawCourt(
  ctx: CanvasRenderingContext2D,
  sport: string,
  width: number,
  height: number
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2;

  switch (sport.trim().toLowerCase()) {
    case "basketball":
      drawBasketballCourt(ctx, width, height);
      break;
    case "soccer":
      drawSoccerField(ctx, width, height);
      break;
    case "football":
      drawFootballField(ctx, width, height);
      break;
    case "baseball":
    case "softball":
      drawBaseballDiamond(ctx, width, height);
      break;
    case "hockey":
      drawHockeyRink(ctx, width, height);
      break;
    case "volleyball":
      drawVolleyballCourt(ctx, width, height);
      break;
    default:
      drawBlankBoard(ctx, width, height);
  }
}
