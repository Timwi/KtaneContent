(() => {
    const svgNs = "http://www.w3.org/2000/svg";
    const xlinkNs = "http://www.w3.org/1999/xlink";
    function createSvgElement(tagName, attributes) {
        const element = document.createElementNS(svgNs, tagName);
        for (const [name, value] of Object.entries(attributes || {}))
            element.setAttribute(name, value);
        return element;
    }

    function polarToCartesian(cx, cy, radius, angle) {
        return {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle)
        };
    }

    function offsetPoint(point, angle, distance) {
        return {
            x: point.x + distance * Math.cos(angle),
            y: point.y + distance * Math.sin(angle)
        };
    }

    function addImage(parent, href, x, y, size) {
        const image = createSvgElement("image", {
            x,
            y,
            width: size,
            height: size,
            preserveAspectRatio: "xMidYMid meet"
        });
        image.setAttributeNS(xlinkNs, "href", href);
        parent.appendChild(image);
    }

    function normalizeChartData(rawChartData) {
        if (Array.isArray(rawChartData))
            return { sourceNames: rawChartData.slice(), displayNames: rawChartData.slice() };
        if (rawChartData && typeof rawChartData === "object") {
            const sourceNames = Object.keys(rawChartData);
            const displayNames = sourceNames.map(key => rawChartData[key]);
            return { sourceNames, displayNames };
        }
        return { sourceNames: [], displayNames: [] };
    }

    function appendText(parent, text, attributes) {
        const element = createSvgElement("text", attributes);
        element.textContent = text;
        parent.appendChild(element);
        return element;
    }

    function appendHighlightableRect(target, padding, attributes) {
        const existing = target.parentNode.querySelector(`:scope > .highlightable[data-highlight-id="${attributes["data-highlight-id"]}"]`);
        if (existing)
            existing.remove();

        const bounds = target.getBBox();
        const rectAttributes = {
            x: bounds.x - padding,
            y: bounds.y - padding,
            width: bounds.width + padding * 2,
            height: bounds.height + padding * 2,
            class: "highlightable",
            fill: "transparent",
            stroke: "none",
            "data-highlight-id": attributes["data-highlight-id"]
        };
        if (attributes.transform)
            rectAttributes.transform = attributes.transform;
        target.parentNode.appendChild(createSvgElement("rect", rectAttributes));
    }

    function finalizeHighlightableGroup(parent, group, pendingHighlightables) {
        parent.appendChild(group);
        pendingHighlightables.push(...Array.from(group.querySelectorAll("[data-highlight-padding]")).map(element => ({
            element,
            padding: Number(element.getAttribute("data-highlight-padding")),
            attributes: {
                "data-highlight-id": element.getAttribute("data-highlight-id"),
                transform: element.getAttribute("transform") || undefined
            }
        })));
    }

    function buildLegendPanel(svg, panelData) {
        if (panelData.type === "note") {
            return buildNotePanel(svg, panelData);
        }
        if (panelData.type === "funfacts") {
            return buildFunFactsPanel(svg, panelData);
        }
        const panelScale = panelData.scale ?? 0.8;
        const viewBoxWidth = 802;
        const viewBoxHeight = 833;
        const translateX = panelData.x ?? (typeof panelData.xRatio === "number" ? -70 + viewBoxWidth * panelData.xRatio : -30);
        const translateY = panelData.y ?? (typeof panelData.yRatio === "number" ? -70 + viewBoxHeight * panelData.yRatio : -25);
        const panel = createSvgElement("g", {
            class: "rps-chart-legend-panel",
            transform: `translate(${translateX} ${translateY}) scale(${panelScale})`
        });
        const x = 0;
        const y = 0;
        const imageSize = panelData.imageSize ?? 28;
        const leftLabelY = y + 64;
        const rightLabelX = x + 270;
        const targetImageX = x + 238;
        const targetImageY = y + 43;
        const primaryImageX = x + 154;
        const primaryImageY = y + 40;
        const secondaryImageX = x + 152;
        const secondaryImageY = y + 76;

        appendText(panel, panelData.title, {
            x,
            y,
            class: "text bold black small",
            "text-anchor": "start"
        });
        appendText(panel, panelData.blackArrowLabel, {
            x: panelData.blackArrowLabelX ?? x,
            y: y + 18,
            class: "text bold black smaller",
            "text-anchor": "start"
        });
        appendText(panel, panelData.redArrowLabel, {
            x: panelData.redArrowLabelX ?? (x + 176),
            y: y + 18,
            class: "text red bold smaller",
            "text-anchor": "start"
        });
        appendText(panel, panelData.primaryLabel, {
            x: x,
            y: primaryImageY + imageSize / 2,
            class: "text bold medium blue",
            "text-anchor": "start",
            "dominant-baseline": "middle"
        });
        appendText(panel, panelData.secondaryLabel, {
            x: secondaryImageX - 6,
            y: secondaryImageY + imageSize / 2,
            class: "text bold medium lavender",
            "text-anchor": "end",
            "dominant-baseline": "middle"
        });
        appendText(panel, panelData.targetLabel, {
            x: rightLabelX,
            y: targetImageY + imageSize / 2,
            class: "text bold red",
            "text-anchor": "start",
            "dominant-baseline": "middle"
        });
        panel.appendChild(createSvgElement("line", {
            x1: x + 28,
            y1: leftLabelY + 8,
            x2: x + 330,
            y2: leftLabelY + 8,
            class: "howto-line"
        }));

        addImage(panel, `img/RPS Judging/Left/Left (${panelData.primaryNumber}).png`, primaryImageX, primaryImageY, imageSize);
        addImage(panel, `img/RPS Judging/Left/Left (${panelData.secondaryNumber}).png`, secondaryImageX, secondaryImageY, imageSize);
        addImage(panel, `img/RPS Judging/Left/Left (${panelData.targetNumber}).png`, targetImageX, targetImageY, imageSize);

        panel.appendChild(createSvgElement("line", {
            x1: primaryImageX + imageSize,
            y1: primaryImageY + imageSize / 2,
            x2: targetImageX + 3,
            y2: targetImageY + imageSize / 2,
            class: "arrow arrowblack",
            "marker-end": "url(#rps-chart-arrowhead)"
        }));
        panel.appendChild(createSvgElement("line", {
            x1: secondaryImageX + imageSize * 0.9,
            y1: secondaryImageY + imageSize * 0.35,
            x2: targetImageX + imageSize * 0.25,
            y2: targetImageY + imageSize * 0.75,
            class: "arrowred dotarrow",
            "marker-end": "url(#rps-chart-outer-to-inner-arrowhead)"
        }));

        appendText(panel, panelData.exampleTitle, {
            x,
            y: y + 120,
            class: "text bold black smaller",
            "text-anchor": "start"
        });
        const exampleLineHeight = panelData.exampleLineHeight ?? 15;
        panelData.exampleLines.forEach((line, index) => {
            appendText(panel, line, {
                x,
                y: y + 140 + index * exampleLineHeight,
                class: "text black small",
                "text-anchor": "start"
            });
        });

        svg.appendChild(panel);
    }

    function buildNotePanel(svg, panelData) {
        const panelScale = panelData.scale ?? 0.5;
        const viewBoxWidth = 802;
        const viewBoxHeight = 833;
        const translateX = panelData.x ?? (typeof panelData.xRatio === "number" ? -70 + viewBoxWidth * panelData.xRatio : 360);
        const translateY = panelData.y ?? (typeof panelData.yRatio === "number" ? -70 + viewBoxHeight * panelData.yRatio : -40);
        const panel = createSvgElement("g", {
            class: "rps-chart-note-panel",
            transform: `translate(${translateX} ${translateY}) scale(${panelScale})`
        });
        const x = 0;
        const y = 0;

        appendText(panel, panelData.title, {
            x,
            y,
            class: "text bold black medium",
            "text-anchor": "start"
        });

        panelData.greenLines.forEach((line, index) => {
            appendText(panel, line, {
                x: 150,
                y: 48 + index * 30,
                class: "text bold medium green",
                "text-anchor": "middle"
            });
        });

        panelData.purpleLines.forEach((line, index) => {
            appendText(panel, line, {
                x: 250,
                y: 155 + index * 30,
                class: "text bold purple medium",
                "text-anchor": "middle"
            });
        });

        svg.appendChild(panel);
    }

    function buildFunFactsPanel(svg, panelData) {
        const panelScale = panelData.scale ?? 0.52;
        const viewBoxWidth = 802;
        const viewBoxHeight = 833;
        const translateX = panelData.x ?? (typeof panelData.xRatio === "number" ? -70 + viewBoxWidth * panelData.xRatio : -40);
        const translateY = panelData.y ?? (typeof panelData.yRatio === "number" ? -70 + viewBoxHeight * panelData.yRatio : 500);
        const panel = createSvgElement("g", {
            class: "rps-chart-facts-panel",
            transform: `translate(${translateX} ${translateY}) scale(${panelScale})`
        });

        appendText(panel, panelData.title, {
            x: 0,
            y: 0,
            class: "text bold medium",
            "text-anchor": "start"
        });

        const factsLineHeight = panelData.lineHeight ?? 29;
        panelData.lines.forEach((line, index) => {
            appendText(panel, line.text, {
                x: 0,
                y: 34 + index * factsLineHeight,
                class: "text bold smaller",
                fill: line.color,
                "text-anchor": "start"
            });
        });

        svg.appendChild(panel);
    }

    function wrapGestureNumber(baseNumber, offset) {
        return ((baseNumber - 1 + offset) % 101) + 1;
    }

    document.addEventListener("DOMContentLoaded", () => {
        const host = document.querySelector("[data-rps-great-chart]");
        const chartData = window.RPSJudgingChartData;
        const legendPanels = Array.isArray(window.RPSJudgingChartHowToReadPanels)
            ? window.RPSJudgingChartHowToReadPanels
            : (Array.isArray(window.RPSJudgingChartLegendPanels) ? window.RPSJudgingChartLegendPanels : []);
        if (!host)
            return;
        const normalizedChartData = normalizeChartData(chartData);
        if (normalizedChartData.displayNames.length === 0)
            return;
        const centerImageSize = 40;
        const sourceNames = normalizedChartData.sourceNames;
        const displayNames = normalizedChartData.displayNames;
        const pendingHighlightables = [];

        const svg = createSvgElement("svg", {
            viewBox: "-70 -70 802 833",
            role: "img",
            "aria-label": "RPS Judging chart",
            class: "centered-img"
        });
        const defs = createSvgElement("defs");
        const centerX = 331;
        const centerY = 346.5;
        const outerRadius = 265;
        const innerRadius = 195;
        const outerImageRadius = 265;
        const innerImageRadius = 215;
        const imageSize = 13.75;
        const labelRadius = outerRadius + 20;
        const innerLabelRadius = innerImageRadius - 10;
        const labelOffset = 8;
        const tangentOffset = 10;
        const segmentCount = displayNames.length;
        const segmentAngle = (Math.PI * 2) / segmentCount;

        const arrowMarker = createSvgElement("marker", {
            id: "rps-chart-arrowhead",
            viewBox: "0 0 10 10",
            refX: "8",
            refY: "5",
            markerWidth: "5",
            markerHeight: "5",
            orient: "auto-start-reverse"
        });
        arrowMarker.appendChild(createSvgElement("path", {
            d: "M 0 0 L 10 5 L 0 10 z",
            fill: "#000"
        }));
        defs.appendChild(arrowMarker);
        const outerToInnerArrowMarker = createSvgElement("marker", {
            id: "rps-chart-outer-to-inner-arrowhead",
            viewBox: "0 0 10 10",
            refX: "8",
            refY: "5",
            markerWidth: "5",
            markerHeight: "5",
            orient: "auto-start-reverse"
        });
        outerToInnerArrowMarker.appendChild(createSvgElement("path", {
            d: "M 0 0 L 10 5 L 0 10 z",
            fill: "#c00"
        }));
        defs.appendChild(outerToInnerArrowMarker);
        svg.appendChild(defs);
        const background = createSvgElement("image", {
            x: -70,
            y: -70,
            width: 802,
            height: 833,
            class: "rps-chart-bg",
            preserveAspectRatio: "xMidYMid slice"
        });
        background.setAttributeNS(xlinkNs, "href", "img/RPS Judging/The Great Chart BG.png");
        svg.appendChild(background);
        const yellowArcRadius = outerRadius + 15;
        const yellowArcDrawRadius = yellowArcRadius - 45;
        const yellowArcEnd = polarToCartesian(centerX, centerY, yellowArcRadius, Math.PI / 2 + 0.035);
        const yellowArc = createSvgElement("path", {
            d: `M ${centerX} ${centerY - yellowArcRadius} A ${yellowArcDrawRadius} ${yellowArcDrawRadius} 0 0 0 ${yellowArcEnd.x} ${yellowArcEnd.y}`,
            class: "defeated-line"
        });
        const yellowTopLine = createSvgElement("line", {
            x1: centerX,
            y1: centerY - yellowArcRadius,
            x2: centerX,
            y2: centerY - yellowArcRadius / 3,
            class: "defeated-line"
        });
        const yellowBottomLine = createSvgElement("line", {
            x1: centerX - 8,
            y1: yellowArcEnd.y,
            x2: centerX,
            y2: centerY - 108,
            class: "defeated-line"
        });
        const centerImage = createSvgElement("image", {
            x: centerX - centerImageSize / 2,
            y: centerY - 126,
            width: centerImageSize,
            height: centerImageSize,
            preserveAspectRatio: "xMidYMid meet"
        });
        centerImage.setAttributeNS(xlinkNs, "href", "img/RPS Judging/Left/Left (1).png");
        const centerLabel = createSvgElement("text", {
            x: centerX + centerImageSize / 2 + 4,
            y: centerY - 106,
            class: "text red",
            "font-size": "14",
            "text-anchor": "start",
            "dominant-baseline": "middle"
        });
        centerLabel.textContent = displayNames[0];
        const title = createSvgElement("text", {
            x: centerX,
            y: centerY - 14,
            class: "text bold title",
            "text-anchor": "middle",
            "dominant-baseline": "middle"
        });
        const titleRps = createSvgElement("tspan", {
            class: "larger"
        });
        titleRps.textContent = "RPS-";
        const title101 = createSvgElement("tspan", {
            class: "large"
        });
        title101.textContent = "101";
        title.appendChild(titleRps);
        title.appendChild(title101);
        svg.appendChild(title);
        for (let index = 0; index < segmentCount; index++) {
            const angle = -Math.PI / 2 - index * segmentAngle;
            const tickStart = polarToCartesian(centerX, centerY, outerRadius, angle);
            const tickEnd = polarToCartesian(centerX, centerY, outerRadius + 16, angle);
            const dividerStart = polarToCartesian(centerX, centerY, innerRadius - 42, angle);
            const dividerEnd = polarToCartesian(centerX, centerY, outerRadius + 92, angle);
            const tick = createSvgElement("line", {
                x1: tickStart.x,
                y1: tickStart.y,
                x2: tickEnd.x,
                y2: tickEnd.y,
                stroke: "#000",
                "stroke-width": "1.5"
            });
            const divider = createSvgElement("line", {
                x1: dividerStart.x,
                y1: dividerStart.y,
                x2: dividerEnd.x,
                y2: dividerEnd.y,
                class: "divider"
            });
            const label = displayNames[index];
            const gestureNumber = index + 1;
            const labelAngle = angle + segmentAngle / 2;
            const labelPosition = polarToCartesian(centerX, centerY, labelRadius + labelOffset, labelAngle);
            const labelRotation = (labelAngle * 180) / Math.PI;
            const outerItem = createSvgElement("g");
            const text = createSvgElement("text", {
                x: labelPosition.x,
                y: labelPosition.y,
                class: "text outer blue",
                "data-highlight-id": `outer-text-${gestureNumber}`,
                "data-highlight-padding": "1.5",
                "text-anchor": "start",
                "dominant-baseline": "middle",
                transform: `rotate(${labelRotation} ${labelPosition.x} ${labelPosition.y})`
            });
            text.textContent = `${label} - ${gestureNumber}`;
            svg.appendChild(divider);
            outerItem.appendChild(text);

            const outerImageCenter = polarToCartesian(centerX, centerY, outerImageRadius, labelAngle);
            const innerImageCenter = polarToCartesian(centerX, centerY, innerImageRadius, labelAngle);
            const arrowStart = polarToCartesian(centerX, centerY, outerImageRadius - imageSize / 2 - 2, labelAngle);
            const arrowEnd = polarToCartesian(centerX, centerY, innerImageRadius + imageSize / 2 + 2, labelAngle);
            svg.appendChild(createSvgElement("line", {
                x1: arrowStart.x,
                y1: arrowStart.y,
                x2: arrowEnd.x,
                y2: arrowEnd.y,
                class: "arrow arrowblack",
                "marker-end": "url(#rps-chart-arrowhead)"
            }));
            const outerImageHref = `img/RPS Judging/Left/Left (${gestureNumber}).png`;
            const innerGestureNumber = wrapGestureNumber(gestureNumber, 50);
            const innerImageHref = `img/RPS Judging/Left/Left (${innerGestureNumber}).png`;
            const outerImage = createSvgElement("image", {
                x: outerImageCenter.x - imageSize / 2,
                y: outerImageCenter.y - imageSize / 2,
                width: imageSize,
                height: imageSize,
                preserveAspectRatio: "xMidYMid meet"
            });
            outerImage.setAttributeNS(xlinkNs, "href", outerImageHref);
            outerItem.appendChild(outerImage);

            const innerLabel = displayNames[innerGestureNumber - 1];
            const innerLabelPosition = polarToCartesian(centerX, centerY, innerLabelRadius, labelAngle);
            const innerLabelRotation = (labelAngle * 180) / Math.PI + 180;
            const innerItem = createSvgElement("g");
            const innerText = createSvgElement("text", {
                x: innerLabelPosition.x,
                y: innerLabelPosition.y,
                class: "text inner red",
                "data-highlight-id": `inner-text-${gestureNumber}`,
                "data-highlight-padding": "1.5",
                "text-anchor": "start",
                "dominant-baseline": "middle",
                transform: `rotate(${innerLabelRotation} ${innerLabelPosition.x} ${innerLabelPosition.y})`
            });
            innerText.textContent = `${innerGestureNumber} - ${innerLabel}`;
            const innerImage = createSvgElement("image", {
                x: innerImageCenter.x - imageSize / 2,
                y: innerImageCenter.y - imageSize / 2,
                width: imageSize,
                height: imageSize,
                preserveAspectRatio: "xMidYMid meet"
            });
            innerImage.setAttributeNS(xlinkNs, "href", innerImageHref);
            innerItem.appendChild(innerImage);
            innerItem.appendChild(innerText);
            finalizeHighlightableGroup(svg, outerItem, pendingHighlightables);
            finalizeHighlightableGroup(svg, innerItem, pendingHighlightables);
        }

        for (let index = 0; index < segmentCount; index++) {
            const currentAngle = -Math.PI / 2 + index * segmentAngle + segmentAngle / 2;
            const previousAngle = -Math.PI / 2 + ((index - 1 + segmentCount) % segmentCount) * segmentAngle + segmentAngle / 2;
            const start = polarToCartesian(centerX, centerY, outerImageRadius + imageSize / 2, currentAngle);
            const end = polarToCartesian(centerX, centerY, outerImageRadius + imageSize / 2 + 3, previousAngle);
            const controlAngle = currentAngle - segmentAngle * 0.55;
            const controlRadius = outerImageRadius + 18;
            const control = polarToCartesian(centerX, centerY, controlRadius, controlAngle);
            svg.appendChild(createSvgElement("path", {
                d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
                class: "arrowblack arrowblack-curved",
                "marker-end": "url(#rps-chart-arrowhead)"
            }));
        }

        for (let index = 0; index < segmentCount; index++) {
            const currentAngle = -Math.PI / 2 + index * segmentAngle + segmentAngle / 2;
            const nextAngle = -Math.PI / 2 + ((index + 1) % segmentCount) * segmentAngle + segmentAngle / 2;
            const start = polarToCartesian(centerX, centerY, outerImageRadius - imageSize / 2 - 2, currentAngle);
            const end = polarToCartesian(centerX, centerY, innerImageRadius + imageSize / 2 + 2, nextAngle);
            svg.appendChild(createSvgElement("line", {
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y,
                class: "dotarrow arrowred",
                "marker-end": "url(#rps-chart-outer-to-inner-arrowhead)"
            }));
        }

        legendPanels.forEach(panelData => buildLegendPanel(svg, panelData));

        const centerItem = createSvgElement("g");
        centerLabel.setAttribute("data-highlight-id", "center-label");
        centerLabel.setAttribute("data-highlight-padding", "2");
        centerItem.appendChild(centerImage);
        centerItem.appendChild(centerLabel);
        svg.appendChild(yellowArc);
        svg.appendChild(yellowTopLine);
        svg.appendChild(yellowBottomLine);
        finalizeHighlightableGroup(svg, centerItem, pendingHighlightables);
        host.replaceChildren(svg);
        pendingHighlightables.forEach(({ element, padding, attributes }) => appendHighlightableRect(element, padding, attributes));
    });
})();
