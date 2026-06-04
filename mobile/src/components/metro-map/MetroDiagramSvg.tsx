import React from "react";
import Svg, { G, Path, Text as SvgText, TSpan } from "react-native-svg";

type MetroLineId = "blue" | "yellow" | "green" | "red";
type MetroLineStatus = "normal" | "disrupted" | "interrupted" | "closed" | "unknown";

type MetroDiagramSvgProps = {
  width?: number | string;
  height?: number | string;
  viewBox?: string;
  showLabels?: boolean;
  showStationDots?: boolean;
  preserveAspectRatio?: string;
  labelColor?: string;
  lineStatuses?: Partial<Record<MetroLineId, MetroLineStatus>>;
  fontFamily?: string;
};

const LINE_COLORS: Record<MetroLineId, string> = {
  blue: "#005CA9",
  yellow: "#FEC82F",
  green: "#00A859",
  red: "#E43C2F",
};

const LINE_STATUS_STYLES: Record<MetroLineStatus, { opacity: number }> = {
  normal: { opacity: 1 },
  disrupted: { opacity: 0.8 },
  interrupted: { opacity: 0.6 },
  closed: { opacity: 0.75 },
  unknown: { opacity: 0.8 },
};

function getLineStatus(
  lineId: MetroLineId,
  lineStatuses?: Partial<Record<MetroLineId, MetroLineStatus>>,
): MetroLineStatus {
  return lineStatuses?.[lineId] ?? "normal";
}

function getLineStroke(
  lineId: MetroLineId,
  lineStatuses?: Partial<Record<MetroLineId, MetroLineStatus>>,
) {
  const status = getLineStatus(lineId, lineStatuses);

  if (status === "closed") {
    return "#9CA3AF";
  }

  if (status === "unknown") {
    return "#CBD5E1";
  }

  return LINE_COLORS[lineId];
}

function getLineOpacity(
  lineId: MetroLineId,
  lineStatuses?: Partial<Record<MetroLineId, MetroLineStatus>>,
) {
  return LINE_STATUS_STYLES[getLineStatus(lineId, lineStatuses)].opacity;
}

export function MetroDiagramSvg({
  width = "100%",
  height = "100%",
  viewBox = "0 0 1024 768",
  showLabels = true,
  showStationDots = true,
  preserveAspectRatio = "xMidYMid meet",
  labelColor = "#1F2933",
  lineStatuses,
  fontFamily = "System",
}: MetroDiagramSvgProps) {
  const Text = ({ fill: _fill, ...props }: React.ComponentProps<typeof SvgText>) => (
    <SvgText {...props} fill={labelColor} />
  );

  return (
    <Svg
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
    >
      <G id="metro-lines-official-position-starter 1">
        <G id="lines">
          <Path id="line-blue" d="M144.5 220.5C144.5 220.5 249.5 217.199 255.5 220.5C261.5 223.801 275 239.5 275 239.5L310.5 275L351 315.5L418 382.5L478 443L575.5 539.5L628.5 592.5C628.5 592.5 660.219 626.5 667 630C673.781 633.5 734 630 734 630H805" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" stroke={getLineStroke("blue", lineStatuses)} opacity={getLineOpacity("blue", lineStatuses)} />
          <Path id="line-yellow" d="M579 116.5V122V156V196V268V361.5V442C564 532.5 567.5 515.5 511.5 579.5" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" stroke={getLineStroke("yellow", lineStatuses)} opacity={getLineOpacity("yellow", lineStatuses)} />
          <Path id="line-green" d="M492.5 291H576.5H627C658 291 672 303 672 321V362V443V607C672 631 656 640 627 640H595.5" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" stroke={getLineStroke("green", lineStatuses)} opacity={getLineOpacity("green", lineStatuses)} />
          <Path id="line-red" d="M665 184H814C851 184 853 210 853 242C853 242 850.812 270.5 846.5 282C842.188 293.5 824 322 824 322L803 352.5L757 417C757 417 740.542 440.78 737.5 443C734.458 445.22 672 443 672 443H579H477" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" stroke={getLineStroke("red", lineStatuses)} opacity={getLineOpacity("red", lineStatuses)} />
        </G>
        {showStationDots ? (
          <>
            <G id="interchanges">
              <Path id="interchange-campo-grande" d="M579 298C583.418 298 587 294.418 587 290C587 285.582 583.418 282 579 282C574.582 282 571 285.582 571 290C571 294.418 574.582 298 579 298Z" fill="white" stroke="#1F2937" strokeWidth={3} />
              <Path id="interchange-roma-areeiro" d="M691 389C695.418 389 699 385.418 699 381C699 376.582 695.418 373 691 373C686.582 373 683 376.582 683 381C683 385.418 686.582 389 691 389Z" fill="white" stroke="#1F2937" strokeWidth={3} />
              <Path id="interchange-sao-sebastiao" d="M478 451C482.418 451 486 447.418 486 443C486 438.582 482.418 435 478 435C473.582 435 470 438.582 470 443C470 447.418 473.582 451 478 451Z" fill="white" stroke="#1F2937" strokeWidth={3} />
              <Path id="interchange-saldanha" d="M579 451C583.418 451 587 447.418 587 443C587 438.582 583.418 435 579 435C574.582 435 571 438.582 571 443C571 447.418 574.582 451 579 451Z" fill="white" stroke="#1F2937" strokeWidth={3} />
              <Path id="interchange-alameda" d="M672 451C676.418 451 680 447.418 680 443C680 438.582 676.418 435 672 435C667.582 435 664 438.582 664 443C664 447.418 667.582 451 672 451Z" fill="white" stroke="#1F2937" strokeWidth={3} />
              <Path id="interchange-marques-pombal" d="M559 531C563.418 531 567 527.418 567 523C567 518.582 563.418 515 559 515C554.582 515 551 518.582 551 523C551 527.418 554.582 531 559 531Z" fill="white" stroke="#1F2937" strokeWidth={3} />
              <Path id="interchange-baixa-chiado" d="M666 636C670.418 636 674 632.418 674 628C674 623.582 670.418 620 666 620C661.582 620 658 623.582 658 628C658 632.418 661.582 636 666 636Z" fill="white" stroke="#1F2937" strokeWidth={3} />
            </G>
            <G id="station-dots">
          <Path id="reboleira" d="M145 224C147.209 224 149 222.209 149 220C149 217.791 147.209 216 145 216C142.791 216 141 217.791 141 220C141 222.209 142.791 224 145 224Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="amadora-este" d="M182 223C184.209 223 186 221.209 186 219C186 216.791 184.209 215 182 215C179.791 215 178 216.791 178 219C178 221.209 179.791 223 182 223Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="alfornelos" d="M216 223C218.209 223 220 221.209 220 219C220 216.791 218.209 215 216 215C213.791 215 212 216.791 212 219C212 221.209 213.791 223 216 223Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="pontinha" d="M255 224C257.209 224 259 222.209 259 220C259 217.791 257.209 216 255 216C252.791 216 251 217.791 251 220C251 222.209 252.791 224 255 224Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="carnide" d="M288 257C290.209 257 292 255.209 292 253C292 250.791 290.209 249 288 249C285.791 249 284 250.791 284 253C284 255.209 285.791 257 288 257Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="colegio-militar" d="M322 290C324.209 290 326 288.209 326 286C326 283.791 324.209 282 322 282C319.791 282 318 283.791 318 286C318 288.209 319.791 290 322 290Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="alto-moinhos" d="M354 322C356.209 322 358 320.209 358 318C358 315.791 356.209 314 354 314C351.791 314 350 315.791 350 318C350 320.209 351.791 322 354 322Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="laranjeiras" d="M384 352C386.209 352 388 350.209 388 348C388 345.791 386.209 344 384 344C381.791 344 380 345.791 380 348C380 350.209 381.791 352 384 352Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="jardim-zoologico" d="M414 382C416.209 382 418 380.209 418 378C418 375.791 416.209 374 414 374C411.791 374 410 375.791 410 378C410 380.209 411.791 382 414 382Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="praca-espanha" d="M445 414C447.209 414 449 412.209 449 410C449 407.791 447.209 406 445 406C442.791 406 441 407.791 441 410C441 412.209 442.791 414 445 414Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="parque" d="M518 487C520.209 487 522 485.209 522 483C522 480.791 520.209 479 518 479C515.791 479 514 480.791 514 483C514 485.209 515.791 487 518 487Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="avenida" d="M595 563C597.209 563 599 561.209 599 559C599 556.791 597.209 555 595 555C592.791 555 591 556.791 591 559C591 561.209 592.791 563 595 563Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="restauradores" d="M632 600C634.209 600 636 598.209 636 596C636 593.791 634.209 592 632 592C629.791 592 628 593.791 628 596C628 598.209 629.791 600 632 600Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="terreiro-paco" d="M726 634C728.209 634 730 632.209 730 630C730 627.791 728.209 626 726 626C723.791 626 722 627.791 722 630C722 632.209 723.791 634 726 634Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="santa-apolonia" d="M804 634C806.209 634 808 632.209 808 630C808 627.791 806.209 626 804 626C801.791 626 800 627.791 800 630C800 632.209 801.791 634 804 634Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="odivelas" d="M579 121C581.209 121 583 119.209 583 117C583 114.791 581.209 113 579 113C576.791 113 575 114.791 575 117C575 119.209 576.791 121 579 121Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="senhor-roubado" d="M579 155C581.209 155 583 153.209 583 151C583 148.791 581.209 147 579 147C576.791 147 575 148.791 575 151C575 153.209 576.791 155 579 155Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="ameixoeira" d="M579 189C581.209 189 583 187.209 583 185C583 182.791 581.209 181 579 181C576.791 181 575 182.791 575 185C575 187.209 576.791 189 579 189Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="lumiar" d="M579 223C581.209 223 583 221.209 583 219C583 216.791 581.209 215 579 215C576.791 215 575 216.791 575 219C575 221.209 576.791 223 579 223Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="quinta-conchas" d="M579 257C581.209 257 583 255.209 583 253C583 250.791 581.209 249 579 249C576.791 249 575 250.791 575 253C575 255.209 576.791 257 579 257Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="cidade-universitaria" d="M579 328C581.209 328 583 326.209 583 324C583 321.791 581.209 320 579 320C576.791 320 575 321.791 575 324C575 326.209 576.791 328 579 328Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="entre-campos" d="M579 368C581.209 368 583 366.209 583 364C583 361.791 581.209 360 579 360C576.791 360 575 361.791 575 364C575 366.209 576.791 368 579 368Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="campo-pequeno" d="M579 408C581.209 408 583 406.209 583 404C583 401.791 581.209 400 579 400C576.791 400 575 401.791 575 404C575 406.209 576.791 408 579 408Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="picoas" d="M572 488C574.209 488 576 486.209 576 484C576 481.791 574.209 480 572 480C569.791 480 568 481.791 568 484C568 486.209 569.791 488 572 488Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="rato" d="M512 583C514.209 583 516 581.209 516 579C516 576.791 514.209 575 512 575C509.791 575 508 576.791 508 579C508 581.209 509.791 583 512 583Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="telheiras" d="M493 295C495.209 295 497 293.209 497 291C497 288.791 495.209 287 493 287C490.791 287 489 288.791 489 291C489 293.209 490.791 295 493 295Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="alvalade" d="M671 318C673.209 318 675 316.209 675 314C675 311.791 673.209 310 671 310C668.791 310 667 311.791 667 314C667 316.209 668.791 318 671 318Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="roma" d="M672 362C674.209 362 676 360.209 676 358C676 355.791 674.209 354 672 354C669.791 354 668 355.791 668 358C668 360.209 669.791 362 672 362Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="areeiro" d="M672 406C674.209 406 676 404.209 676 402C676 399.791 674.209 398 672 398C669.791 398 668 399.791 668 402C668 404.209 669.791 406 672 406Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="arroios" d="M672 489C674.209 489 676 487.209 676 485C676 482.791 674.209 481 672 481C669.791 481 668 482.791 668 485C668 487.209 669.791 489 672 489Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="anjos" d="M672 517C674.209 517 676 515.209 676 513C676 510.791 674.209 509 672 509C669.791 509 668 510.791 668 513C668 515.209 669.791 517 672 517Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="intendente" d="M672 545C674.209 545 676 543.209 676 541C676 538.791 674.209 537 672 537C669.791 537 668 538.791 668 541C668 543.209 669.791 545 672 545Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="martim-moniz" d="M672 573C674.209 573 676 571.209 676 569C676 566.791 674.209 565 672 565C669.791 565 668 566.791 668 569C668 571.209 669.791 573 672 573Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="rossio" d="M672 601C674.209 601 676 599.209 676 597C676 594.791 674.209 593 672 593C669.791 593 668 594.791 668 597C668 599.209 669.791 601 672 601Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="cais-sodre" d="M596 644C598.209 644 600 642.209 600 640C600 637.791 598.209 636 596 636C593.791 636 592 637.791 592 640C592 642.209 593.791 644 596 644Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="encarnacao" d="M741 188C743.209 188 745 186.209 745 184C745 181.791 743.209 180 741 180C738.791 180 737 181.791 737 184C737 186.209 738.791 188 741 188Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="aeroporto" d="M665 188C667.209 188 669 186.209 669 184C669 181.791 667.209 180 665 180C662.791 180 661 181.791 661 184C661 186.209 662.791 188 665 188Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="moscavide" d="M814 188C816.209 188 818 186.209 818 184C818 181.791 816.209 180 814 180C811.791 180 810 181.791 810 184C810 186.209 811.791 188 814 188Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="oriente" d="M853 246C855.209 246 857 244.209 857 242C857 239.791 855.209 238 853 238C850.791 238 849 239.791 849 242C849 244.209 850.791 246 853 246Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="cabo-ruivo" d="M840 300C842.209 300 844 298.209 844 296C844 293.791 842.209 292 840 292C837.791 292 836 293.791 836 296C836 298.209 837.791 300 840 300Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="olivais" d="M819 333C821.209 333 823 331.209 823 329C823 326.791 821.209 325 819 325C816.791 325 815 326.791 815 329C815 331.209 816.791 333 819 333Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="bela-vista" d="M772 399C774.209 399 776 397.209 776 395C776 392.791 774.209 391 772 391C769.791 391 768 392.791 768 395C768 397.209 769.791 399 772 399Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="olaias" d="M748 433C750.209 433 752 431.209 752 429C752 426.791 750.209 425 748 425C745.791 425 744 426.791 744 429C744 431.209 745.791 433 748 433Z" fill="white" stroke="white" strokeWidth={2} />
          <Path id="chelas" d="M797 364C799.209 364 801 362.209 801 360C801 357.791 799.209 356 797 356C794.791 356 793 357.791 793 360C793 362.209 794.791 364 797 364Z" fill="white" stroke="white" strokeWidth={2} />
            </G>
          </>
        ) : null}
        {showLabels ? (
          <G id="titles">
          <G id="red-line-titles">
            <Text id="S. SebastiÃ£o" fill="#1F2933" fontFamily={fontFamily} fontSize={11} fontWeight="bold" letterSpacing="0em">
              <TSpan x="397" y="449.41">S. Sebastião</TSpan>
            </Text>
            <Text id="Saldanha" fill="#1F2933" fontFamily={fontFamily} fontSize={11} fontWeight="bold" letterSpacing="0em">
              <TSpan x="587" y="431.41">Saldanha</TSpan>
            </Text>
            <Text id="Alameda" fill="#1F2933" fontFamily={fontFamily} fontSize={11} fontWeight="bold" letterSpacing="0em">
              <TSpan x="682" y="462.41">Alameda</TSpan>
            </Text>
            <Text id="Olaias" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="709" y="425.555">Olaias</TSpan>
            </Text>
            <Text id="Bela Vista" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="782" y="403.555">Bela Vista</TSpan>
            </Text>
            <Text id="Chelas" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="807" y="368.555">Chelas</TSpan>
            </Text>
            <Text id="Olivais" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="828" y="336.555">Olivais</TSpan>
            </Text>
            <Text id="Cabo Ruivo" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="850" y="302.555">Cabo Ruivo</TSpan>
            </Text>
            <Text id="Oriente" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="807" y="244.555">Oriente</TSpan>
            </Text>
            <Text id="Moscavide" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="789" y="170.555">Moscavide</TSpan>
            </Text>
            <Text id="EncarnaÃ§Ã£o" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="714" y="202.555">Encarnação</TSpan>
            </Text>
            <Text id="Aeroporto" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="638" y="172.555">Aeroporto</TSpan>
            </Text>
          </G>
          <G id="blue-line-titles">
            <Text id="Reboleira" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="119" y="208.555">Reboleira</TSpan>
            </Text>
            <Text id="Amadora Este" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="150" y="238.555">Amadora Este</TSpan>
            </Text>
            <Text id="Alfornelos" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="195" y="207.555">Alfornelos</TSpan>
            </Text>
            <Text id="Pontinha" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="259" y="210.555">Pontinha</TSpan>
            </Text>
            <Text id="Carnide" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="295" y="247.555">Carnide</TSpan>
            </Text>
            <Text id="ColÃ©gio Militar/Luz" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="330" y="281.555">Colégio Militar/Luz</TSpan>
            </Text>
            <Text id="Alto dos Moinhos" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="361" y="311.555">Alto dos Moinhos</TSpan>
            </Text>
            <Text id="Laranjeiras" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="321" y="355.555">Laranjeiras</TSpan>
            </Text>
            <Text id="Jardim ZoolÃ³gico" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="321" y="384.555">Jardim Zoológico</TSpan>
            </Text>
            <Text id="PraÃ§a de Espanha" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="349" y="416.555">Praça de Espanha</TSpan>
            </Text>
            <Text id="Parque" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="475" y="491.555">Parque</TSpan>
            </Text>
            <Text id="MarquÃªs de Pombal" fill="#1F2933" fontFamily={fontFamily} fontSize={11} fontWeight="bold" letterSpacing="0em">
              <TSpan x="434" y="528.41">Marquês de Pombal</TSpan>
            </Text>
            <Text id="Avenida" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="602" y="552.555">Avenida</TSpan>
            </Text>
            <Text id="Restauradores" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="553" y="602.555">Restauradores</TSpan>
            </Text>
            <Text id="Baixa-Chiado" fill="#1F2933" fontFamily={fontFamily} fontSize={11} fontWeight="bold" letterSpacing="0em">
              <TSpan x="653" y="654.41">Baixa-Chiado</TSpan>
            </Text>
            <Text id="Terreiro do PaÃ§o" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="687" y="619.555">Terreiro do Paço</TSpan>
            </Text>
            <Text id="Santa ApolÃ³nia" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="768" y="646.555">Santa Apolónia</TSpan>
            </Text>
          </G>
          <G id="green-line-titles">
            <Text id="Rossio" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="599.555">Rossio</TSpan>
            </Text>
            <Text id="Martim Moniz" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="572.555">Martim Moniz</TSpan>
            </Text>
            <Text id="Intendente" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="544.555">Intendente</TSpan>
            </Text>
            <Text id="Anjos" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="516.555">Anjos</TSpan>
            </Text>
            <Text id="Arroios" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="489.555">Arroios</TSpan>
            </Text>
            <Text id="Areeiro" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="405.555">Areeiro</TSpan>
            </Text>
            <Text id="Roma/Areeiro" fill="#1F2933" fontFamily={fontFamily} fontSize={9} fontWeight="510" letterSpacing="0em">
              <TSpan x="703" y="383.699">Roma/Areeiro</TSpan>
            </Text>
            <Text id="Roma" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="361.555">Roma</TSpan>
            </Text>
            <Text id="Alvalade" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="682" y="317.555">Alvalade</TSpan>
            </Text>
            <Text id="Campo Grande" fill="#1F2933" fontFamily={fontFamily} fontSize={11} fontWeight="bold" letterSpacing="0em">
              <TSpan x="587" y="279.41">Campo Grande</TSpan>
            </Text>
            <Text id="Telheiras" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="471" y="279.555">Telheiras</TSpan>
            </Text>
          </G>
          <G id="yellow-line-titles">
            <Text id="Odivelas" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="526" y="120.555">Odivelas</TSpan>
            </Text>
            <Text id="Senhor Roubado" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="488" y="154.555">Senhor Roubado</TSpan>
            </Text>
            <Text id="Ameixoeira" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="514" y="188.555">Ameixoeira</TSpan>
            </Text>
            <Text id="Lumiar" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="535" y="222.555">Lumiar</TSpan>
            </Text>
            <Text id="Quinta das Conchas" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="471" y="256.555">Quinta das Conchas</TSpan>
            </Text>
            <Text id="Cidade UniversitÃ¡ria" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="470" y="327.555">Cidade Universitária</TSpan>
            </Text>
            <Text id="Entre Campos" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="500" y="367.555">Entre Campos</TSpan>
            </Text>
            <Text id="Campo Pequeno" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="490" y="407.555">Campo Pequeno</TSpan>
            </Text>
            <Text id="Picoas" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="582" y="488.555">Picoas</TSpan>
            </Text>
            <Text id="Rato" fill="#1F2933" fontFamily={fontFamily} fontSize={10} fontWeight="510" letterSpacing="0em">
              <TSpan x="480" y="583.555">Rato</TSpan>
            </Text>
          </G>
          </G>
        ) : null}
      </G>
    </Svg>
  );
}

export default MetroDiagramSvg;
