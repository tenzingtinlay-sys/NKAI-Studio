import { __toESM } from "../_runtime.mjs";
import { require_react } from "./@tanstack/react-router+[...].mjs";
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toKebabCase = (string) => string?.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
function toLucideIconData(iconName, iconNode, aliases = []) {
	if (iconNode == null) throw new Error("[lucide]: iconNode is required when icon name is used");
	return {
		name: toKebabCase(iconName),
		size: 24,
		node: iconNode,
		...aliases.length > 0 ? { aliases } : {}
	};
}
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toCamelCase = (string) => {
	let out = "";
	let upperNext = false;
	for (const ch of string) {
		if (ch === "-" || ch === "_" || ch <= " ") {
			upperNext = out.length > 0;
			continue;
		}
		if (out.length === 0) out += ch.toLowerCase();
		else out += upperNext ? ch.toUpperCase() : ch;
		upperNext = false;
	}
	return out;
};
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toPascalCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
	return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": 2,
	"stroke-linecap": "round",
	"stroke-linejoin": "round"
};
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
function isDefined(value) {
	return value !== null && value !== void 0;
}
function buildLucideIconNode(icon, params = {}) {
	const attributeNames = params.attributeNames ?? {};
	const getAttributeName = (attributeName) => attributeNames[attributeName] ?? attributeName;
	const viewBoxWidth = icon.size ?? icon.width ?? defaultAttributes["width"];
	const viewBoxHeight = icon.size ?? icon.height ?? defaultAttributes["height"];
	const aliasClassNames = icon.aliases?.filter((alias) => typeof alias === "string" && alias.trim() !== "").map((alias) => `lucide-${alias}`) ?? [];
	const iconClassNames = [...icon.name ? [`lucide-${icon.name}`] : [], ...aliasClassNames];
	const classNamesFromClassName = params.className?.split(" ").filter(Boolean) ?? [];
	const className = params.includeDefaultClasses === false ? mergeClasses(...classNamesFromClassName) : mergeClasses("lucide", ...iconClassNames, ...classNamesFromClassName);
	const calculatedStrokeWidth = params.absoluteStrokeWidth ? Number(params.strokeWidth ?? defaultAttributes["stroke-width"]) * Number(icon.size ?? icon.width ?? defaultAttributes["width"]) / Number(params.size ?? params.width ?? defaultAttributes["width"]) : params.strokeWidth ?? defaultAttributes["stroke-width"];
	return [
		"svg",
		{
			...Object.entries(defaultAttributes).reduce((attrs, [attrName, value]) => {
				attrs[getAttributeName(attrName)] = value;
				return attrs;
			}, {}),
			..."color" in params && params.color && { [getAttributeName("stroke")]: params.color },
			..."size" in params && isDefined(params.size) && {
				[getAttributeName("width")]: params.size,
				[getAttributeName("height")]: params.size
			},
			..."width" in params && isDefined(params.width) && { [getAttributeName("width")]: params.width },
			..."height" in params && isDefined(params.height) && { [getAttributeName("height")]: params.height },
			[getAttributeName("stroke-width")]: calculatedStrokeWidth,
			...className && { [getAttributeName("class")]: className },
			[getAttributeName("viewBox")]: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
			...params.hasA11yProp === false ? { [getAttributeName("aria-hidden")]: "true" } : {},
			..."attributes" in params && params.attributes
		},
		icon.node.map((child) => {
			const [name, attrs, children] = child;
			const nextAttrs = params.nonScalingStroke ? {
				[getAttributeName("vector-effect")]: "non-scaling-stroke",
				...attrs
			} : attrs;
			return children ? [
				name,
				nextAttrs,
				children
			] : [name, nextAttrs];
		})
	];
}
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
function buildLucideIconForReact(icon, params = {}) {
	return buildLucideIconNode(icon, {
		...params,
		attributeNames: {
			...params.attributeNames,
			class: "className",
			"stroke-width": "strokeWidth",
			"stroke-linecap": "strokeLinecap",
			"stroke-linejoin": "strokeLinejoin",
			"vector-effect": "vectorEffect"
		}
	});
}
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
//#endregion
//#region node_modules/lucide-react/dist/esm/context.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = (0, import_react.createContext)({});
var useLucideContext = () => (0, import_react.useContext)(LucideContext);
//#endregion
//#region node_modules/lucide-react/dist/esm/Icon.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Icon = (0, import_react.forwardRef)(({ color, size, width, height, strokeWidth, absoluteStrokeWidth, nonScalingStroke, className = "", children, iconNode = [], icon = {
	node: iconNode,
	aliases: [],
	size: 24
}, ...rest }, ref) => {
	const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, nonScalingStroke: contextNonScalingStroke = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
	const hasAccessibleProp = Boolean(children) || hasA11yProp(rest);
	const [name, svgAttributes, builtIconNode = []] = buildLucideIconForReact(icon, {
		color: color ?? contextColor,
		width: width ?? size ?? contextSize,
		height: height ?? size ?? contextSize,
		strokeWidth: strokeWidth ?? contextStrokeWidth,
		absoluteStrokeWidth: absoluteStrokeWidth ?? contextAbsoluteStrokeWidth,
		nonScalingStroke: nonScalingStroke ?? contextNonScalingStroke,
		className: mergeClasses(contextClass, className),
		hasA11yProp: hasAccessibleProp,
		attributes: rest
	});
	return (0, import_react.createElement)(name, {
		ref,
		...svgAttributes
	}, [...builtIconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
});
//#endregion
//#region node_modules/lucide-react/dist/esm/createLucideIcon.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
function createLucideIcon(iconDataOrName, iconNode = [], aliases = []) {
	const iconData = typeof iconDataOrName === "string" ? toLucideIconData(iconDataOrName, iconNode, aliases) : iconDataOrName;
	const Component = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_react.createElement)(Icon, {
		ref,
		icon: iconData,
		className,
		...props
	}));
	if (iconData.name) Component.displayName = toPascalCase(iconData.name);
	return Component;
}
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/activity.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$47 = {
	name: "activity",
	size: 24,
	node: [["path", {
		d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
		key: "169zse"
	}]]
};
__iconData$47.node;
var Activity = createLucideIcon(__iconData$47);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/arrow-down-to-line.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$46 = {
	name: "arrow-down-to-line",
	size: 24,
	node: [
		["path", {
			d: "M12 17V3",
			key: "1cwfxf"
		}],
		["path", {
			d: "m6 11 6 6 6-6",
			key: "12ii2o"
		}],
		["path", {
			d: "M19 21H5",
			key: "150jfl"
		}]
	]
};
__iconData$46.node;
var ArrowDownToLine = createLucideIcon(__iconData$46);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/arrow-left.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$45 = {
	name: "arrow-left",
	size: 24,
	node: [["path", {
		d: "m12 19-7-7 7-7",
		key: "1l729n"
	}], ["path", {
		d: "M19 12H5",
		key: "x3x0zl"
	}]]
};
__iconData$45.node;
var ArrowLeft = createLucideIcon(__iconData$45);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/arrow-right.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$44 = {
	name: "arrow-right",
	size: 24,
	node: [["path", {
		d: "M5 12h14",
		key: "1ays0h"
	}], ["path", {
		d: "m12 5 7 7-7 7",
		key: "xquz4c"
	}]]
};
__iconData$44.node;
var ArrowRight = createLucideIcon(__iconData$44);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/audio-lines.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$43 = {
	name: "audio-lines",
	size: 24,
	node: [
		["path", {
			d: "M2 10v3",
			key: "1fnikh"
		}],
		["path", {
			d: "M6 6v11",
			key: "11sgs0"
		}],
		["path", {
			d: "M10 3v18",
			key: "yhl04a"
		}],
		["path", {
			d: "M14 8v7",
			key: "3a1oy3"
		}],
		["path", {
			d: "M18 5v13",
			key: "123xd1"
		}],
		["path", {
			d: "M22 10v3",
			key: "154ddg"
		}]
	]
};
__iconData$43.node;
var AudioLines = createLucideIcon(__iconData$43);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/bot.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$42 = {
	name: "bot",
	size: 24,
	node: [
		["path", {
			d: "M12 8V4H8",
			key: "hb8ula"
		}],
		["rect", {
			width: "16",
			height: "12",
			x: "4",
			y: "8",
			rx: "2",
			key: "enze0r"
		}],
		["path", {
			d: "M2 14h2",
			key: "vft8re"
		}],
		["path", {
			d: "M20 14h2",
			key: "4cs60a"
		}],
		["path", {
			d: "M15 13v2",
			key: "1xurst"
		}],
		["path", {
			d: "M9 13v2",
			key: "rq6x2g"
		}]
	]
};
__iconData$42.node;
var Bot = createLucideIcon(__iconData$42);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/boxes.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$41 = {
	name: "boxes",
	size: 24,
	node: [
		["path", {
			d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
			key: "lc1i9w"
		}],
		["path", {
			d: "m7 16.5-4.74-2.85",
			key: "1o9zyk"
		}],
		["path", {
			d: "m7 16.5 5-3",
			key: "va8pkn"
		}],
		["path", {
			d: "M7 16.5v5.17",
			key: "jnp8gn"
		}],
		["path", {
			d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
			key: "8zsnat"
		}],
		["path", {
			d: "m17 16.5-5-3",
			key: "8arw3v"
		}],
		["path", {
			d: "m17 16.5 4.74-2.85",
			key: "8rfmw"
		}],
		["path", {
			d: "M17 16.5v5.17",
			key: "k6z78m"
		}],
		["path", {
			d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
			key: "1xygjf"
		}],
		["path", {
			d: "M12 8 7.26 5.15",
			key: "1vbdud"
		}],
		["path", {
			d: "m12 8 4.74-2.85",
			key: "3rx089"
		}],
		["path", {
			d: "M12 13.5V8",
			key: "1io7kd"
		}]
	]
};
__iconData$41.node;
var Boxes = createLucideIcon(__iconData$41);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/brain.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$40 = {
	name: "brain",
	size: 24,
	node: [
		["path", {
			d: "M12 18V5",
			key: "adv99a"
		}],
		["path", {
			d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",
			key: "1e3is1"
		}],
		["path", {
			d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",
			key: "1gqd8o"
		}],
		["path", {
			d: "M17.997 5.125a4 4 0 0 1 2.526 5.77",
			key: "iwvgf7"
		}],
		["path", {
			d: "M18 18a4 4 0 0 0 2-7.464",
			key: "efp6ie"
		}],
		["path", {
			d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",
			key: "1gq6am"
		}],
		["path", {
			d: "M6 18a4 4 0 0 1-2-7.464",
			key: "k1g0md"
		}],
		["path", {
			d: "M6.003 5.125a4 4 0 0 0-2.526 5.77",
			key: "q97ue3"
		}]
	]
};
__iconData$40.node;
var Brain = createLucideIcon(__iconData$40);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/camera-off.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$39 = {
	name: "camera-off",
	size: 24,
	node: [
		["path", {
			d: "M14.564 14.558a3 3 0 1 1-4.122-4.121",
			key: "1rnrzw"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}],
		["path", {
			d: "M20 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 .819-.175",
			key: "1x3arw"
		}],
		["path", {
			d: "M9.695 4.024A2 2 0 0 1 10.004 4h3.993a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v7.344",
			key: "1i84u0"
		}]
	]
};
__iconData$39.node;
var CameraOff = createLucideIcon(__iconData$39);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/camera.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$38 = {
	name: "camera",
	size: 24,
	node: [["path", {
		d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",
		key: "18u6gg"
	}], ["circle", {
		cx: "12",
		cy: "13",
		r: "3",
		key: "1vg3eu"
	}]]
};
__iconData$38.node;
var Camera = createLucideIcon(__iconData$38);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/circle-alert.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$37 = {
	name: "circle-alert",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "8",
			y2: "12",
			key: "1pkeuh"
		}],
		["line", {
			x1: "12",
			x2: "12.01",
			y1: "16",
			y2: "16",
			key: "4dfq90"
		}]
	],
	aliases: ["alert-circle"]
};
__iconData$37.node;
var CircleAlert = createLucideIcon(__iconData$37);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/circle-check.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$36 = {
	name: "circle-check",
	size: 24,
	node: [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}], ["path", {
		d: "m16 9-5.5 5.5L8 12",
		key: "xofnsj"
	}]],
	aliases: ["check-circle-2"]
};
__iconData$36.node;
var CircleCheck = createLucideIcon(__iconData$36);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/circle-stop.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$35 = {
	name: "circle-stop",
	size: 24,
	node: [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}], ["rect", {
		x: "9",
		y: "9",
		width: "6",
		height: "6",
		rx: "1",
		key: "1ssd4o"
	}]],
	aliases: ["stop-circle"]
};
__iconData$35.node;
var CircleStop = createLucideIcon(__iconData$35);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/clapperboard.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$34 = {
	name: "clapperboard",
	size: 24,
	node: [
		["path", {
			d: "m12.296 3.464 3.02 3.956",
			key: "qash78"
		}],
		["path", {
			d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z",
			key: "1h7j8b"
		}],
		["path", {
			d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
			key: "4lm6w1"
		}],
		["path", {
			d: "m6.18 5.276 3.1 3.899",
			key: "zjj9t3"
		}]
	]
};
__iconData$34.node;
var Clapperboard = createLucideIcon(__iconData$34);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/cloud-cog.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$33 = {
	name: "cloud-cog",
	size: 24,
	node: [
		["path", {
			d: "m10.852 19.772-.383.924",
			key: "r7sl7d"
		}],
		["path", {
			d: "m13.148 14.228.383-.923",
			key: "1d5zpm"
		}],
		["path", {
			d: "M13.148 19.772a3 3 0 1 0-2.296-5.544l-.383-.923",
			key: "1ydik7"
		}],
		["path", {
			d: "m13.53 20.696-.382-.924a3 3 0 1 1-2.296-5.544",
			key: "1m1vsf"
		}],
		["path", {
			d: "m14.772 15.852.923-.383",
			key: "660p6e"
		}],
		["path", {
			d: "m14.772 18.148.923.383",
			key: "hrcpis"
		}],
		["path", {
			d: "M4.2 15.1a7 7 0 1 1 9.93-9.858A7 7 0 0 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2",
			key: "j2q98n"
		}],
		["path", {
			d: "m9.228 15.852-.923-.383",
			key: "1p9ong"
		}],
		["path", {
			d: "m9.228 18.148-.923.383",
			key: "6558rz"
		}]
	]
};
__iconData$33.node;
var CloudCog = createLucideIcon(__iconData$33);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/external-link.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$32 = {
	name: "external-link",
	size: 24,
	node: [
		["path", {
			d: "M15 3h6v6",
			key: "1q9fwt"
		}],
		["path", {
			d: "M10 14 21 3",
			key: "gplh6r"
		}],
		["path", {
			d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
			key: "a6xqqp"
		}]
	]
};
__iconData$32.node;
var ExternalLink = createLucideIcon(__iconData$32);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/folder-kanban.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$31 = {
	name: "folder-kanban",
	size: 24,
	node: [
		["path", {
			d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z",
			key: "1fr9dc"
		}],
		["path", {
			d: "M8 10v4",
			key: "tgpxqk"
		}],
		["path", {
			d: "M12 10v2",
			key: "hh53o1"
		}],
		["path", {
			d: "M16 10v6",
			key: "1d6xys"
		}]
	]
};
__iconData$31.node;
var FolderKanban = createLucideIcon(__iconData$31);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/image-plus.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$30 = {
	name: "image-plus",
	size: 24,
	node: [
		["path", {
			d: "M16 5h6",
			key: "1vod17"
		}],
		["path", {
			d: "M19 2v6",
			key: "4bpg5p"
		}],
		["path", {
			d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",
			key: "1ue2ih"
		}],
		["path", {
			d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
			key: "1xmnt7"
		}],
		["circle", {
			cx: "9",
			cy: "9",
			r: "2",
			key: "af1f0g"
		}]
	]
};
__iconData$30.node;
var ImagePlus = createLucideIcon(__iconData$30);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/image.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$29 = {
	name: "image",
	size: 24,
	node: [
		["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			ry: "2",
			key: "1m3agn"
		}],
		["circle", {
			cx: "9",
			cy: "9",
			r: "2",
			key: "af1f0g"
		}],
		["path", {
			d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
			key: "1xmnt7"
		}]
	]
};
__iconData$29.node;
var Image = createLucideIcon(__iconData$29);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/layout-template.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$28 = {
	name: "layout-template",
	size: 24,
	node: [
		["rect", {
			width: "18",
			height: "7",
			x: "3",
			y: "3",
			rx: "1",
			key: "f1a2em"
		}],
		["rect", {
			width: "9",
			height: "7",
			x: "3",
			y: "14",
			rx: "1",
			key: "jqznyg"
		}],
		["rect", {
			width: "5",
			height: "7",
			x: "16",
			y: "14",
			rx: "1",
			key: "q5h2i8"
		}]
	]
};
__iconData$28.node;
var LayoutTemplate = createLucideIcon(__iconData$28);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/log-in.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$27 = {
	name: "log-in",
	size: 24,
	node: [
		["path", {
			d: "m10 17 5-5-5-5",
			key: "1bsop3"
		}],
		["path", {
			d: "M15 12H3",
			key: "6jk70r"
		}],
		["path", {
			d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",
			key: "u53s6r"
		}]
	]
};
__iconData$27.node;
var LogIn = createLucideIcon(__iconData$27);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/menu.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$26 = {
	name: "menu",
	size: 24,
	node: [
		["path", {
			d: "M4 5h16",
			key: "1tepv9"
		}],
		["path", {
			d: "M4 12h16",
			key: "1lakjw"
		}],
		["path", {
			d: "M4 19h16",
			key: "1djgab"
		}]
	]
};
__iconData$26.node;
var Menu = createLucideIcon(__iconData$26);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/mic-off.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$25 = {
	name: "mic-off",
	size: 24,
	node: [
		["path", {
			d: "M12 19v3",
			key: "npa21l"
		}],
		["path", {
			d: "M15 9.34V5a3 3 0 0 0-5.68-1.33",
			key: "1gzdoj"
		}],
		["path", {
			d: "M16.95 16.95A7 7 0 0 1 5 12v-2",
			key: "cqa7eg"
		}],
		["path", {
			d: "M18.89 13.23A7 7 0 0 0 19 12v-2",
			key: "16hl24"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}],
		["path", {
			d: "M9 9v3a3 3 0 0 0 5.12 2.12",
			key: "r2i35w"
		}]
	]
};
__iconData$25.node;
var MicOff = createLucideIcon(__iconData$25);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/mic.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$24 = {
	name: "mic",
	size: 24,
	node: [
		["path", {
			d: "M12 19v3",
			key: "npa21l"
		}],
		["path", {
			d: "M19 10v2a7 7 0 0 1-14 0v-2",
			key: "1vc78b"
		}],
		["rect", {
			x: "9",
			y: "2",
			width: "6",
			height: "13",
			rx: "3",
			key: "s6n7sd"
		}]
	]
};
__iconData$24.node;
var Mic = createLucideIcon(__iconData$24);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/monitor-play.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$23 = {
	name: "monitor-play",
	size: 24,
	node: [
		["path", {
			d: "M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z",
			key: "vbtd3f"
		}],
		["path", {
			d: "M12 17v4",
			key: "1riwvh"
		}],
		["path", {
			d: "M8 21h8",
			key: "1ev6f3"
		}],
		["rect", {
			x: "2",
			y: "3",
			width: "20",
			height: "14",
			rx: "2",
			key: "x3v2xh"
		}]
	]
};
__iconData$23.node;
var MonitorPlay = createLucideIcon(__iconData$23);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/moon.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$22 = {
	name: "moon",
	size: 24,
	node: [["path", {
		d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
		key: "kfwtm"
	}]]
};
__iconData$22.node;
var Moon = createLucideIcon(__iconData$22);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/palette.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$21 = {
	name: "palette",
	size: 24,
	node: [
		["path", {
			d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",
			key: "e79jfc"
		}],
		["circle", {
			cx: "13.5",
			cy: "6.5",
			r: ".5",
			fill: "currentColor",
			key: "1okk4w"
		}],
		["circle", {
			cx: "17.5",
			cy: "10.5",
			r: ".5",
			fill: "currentColor",
			key: "f64h9f"
		}],
		["circle", {
			cx: "6.5",
			cy: "12.5",
			r: ".5",
			fill: "currentColor",
			key: "qy21gx"
		}],
		["circle", {
			cx: "8.5",
			cy: "7.5",
			r: ".5",
			fill: "currentColor",
			key: "fotxhn"
		}]
	]
};
__iconData$21.node;
var Palette = createLucideIcon(__iconData$21);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/paperclip.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$20 = {
	name: "paperclip",
	size: 24,
	node: [["path", {
		d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",
		key: "1miecu"
	}]]
};
__iconData$20.node;
var Paperclip = createLucideIcon(__iconData$20);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/pen-tool.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$19 = {
	name: "pen-tool",
	size: 24,
	node: [
		["path", {
			d: "m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18",
			key: "93nyr4"
		}],
		["path", {
			d: "M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z",
			key: "lnux7s"
		}],
		["path", {
			d: "m3 3 6.586 6.586",
			key: "1igwcn"
		}],
		["circle", {
			cx: "11",
			cy: "11",
			r: "2",
			key: "xmgehs"
		}]
	]
};
__iconData$19.node;
var PenTool = createLucideIcon(__iconData$19);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/phone-off.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$18 = {
	name: "phone-off",
	size: 24,
	node: [
		["path", {
			d: "M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272",
			key: "1wngk7"
		}],
		["path", {
			d: "M22 2 2 22",
			key: "y4kqgn"
		}],
		["path", {
			d: "M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473",
			key: "10hv5p"
		}]
	]
};
__iconData$18.node;
var PhoneOff = createLucideIcon(__iconData$18);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/plug.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$17 = {
	name: "plug",
	size: 24,
	node: [
		["path", {
			d: "M12 22v-5",
			key: "1ega77"
		}],
		["path", {
			d: "M15 8V2",
			key: "18g5xt"
		}],
		["path", {
			d: "M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",
			key: "1xoxul"
		}],
		["path", {
			d: "M9 8V2",
			key: "14iosj"
		}]
	]
};
__iconData$17.node;
var Plug = createLucideIcon(__iconData$17);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/radio.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$16 = {
	name: "radio",
	size: 24,
	node: [
		["path", {
			d: "M16.247 7.761a6 6 0 0 1 0 8.478",
			key: "1fwjs5"
		}],
		["path", {
			d: "M19.075 4.933a10 10 0 0 1 0 14.134",
			key: "ehdyv1"
		}],
		["path", {
			d: "M4.925 19.067a10 10 0 0 1 0-14.134",
			key: "1q22gi"
		}],
		["path", {
			d: "M7.753 16.239a6 6 0 0 1 0-8.478",
			key: "r2q7qm"
		}],
		["circle", {
			cx: "12",
			cy: "12",
			r: "2",
			key: "1c9p78"
		}]
	]
};
__iconData$16.node;
var Radio = createLucideIcon(__iconData$16);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/redo-2.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$15 = {
	name: "redo-2",
	size: 24,
	node: [["path", {
		d: "m15 14 5-5-5-5",
		key: "12vg1m"
	}], ["path", {
		d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13",
		key: "6uklza"
	}]]
};
__iconData$15.node;
var Redo2 = createLucideIcon(__iconData$15);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/refresh-cw.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$14 = {
	name: "refresh-cw",
	size: 24,
	node: [
		["path", {
			d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
			key: "v9h5vc"
		}],
		["path", {
			d: "M21 3v5h-5",
			key: "1q7to0"
		}],
		["path", {
			d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
			key: "3uifl3"
		}],
		["path", {
			d: "M8 16H3v5",
			key: "1cv678"
		}]
	]
};
__iconData$14.node;
var RefreshCw = createLucideIcon(__iconData$14);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/search.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$13 = {
	name: "search",
	size: 24,
	node: [["path", {
		d: "m21 21-4.34-4.34",
		key: "14j7rj"
	}], ["circle", {
		cx: "11",
		cy: "11",
		r: "8",
		key: "4ej97u"
	}]]
};
__iconData$13.node;
var Search = createLucideIcon(__iconData$13);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/send.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$12 = {
	name: "send",
	size: 24,
	node: [["path", {
		d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
		key: "1ffxy3"
	}], ["path", {
		d: "m21.854 2.147-10.94 10.939",
		key: "12cjpa"
	}]]
};
__iconData$12.node;
var Send = createLucideIcon(__iconData$12);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/settings.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$11 = {
	name: "settings",
	size: 24,
	node: [["path", {
		d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
		key: "1i5ecw"
	}], ["circle", {
		cx: "12",
		cy: "12",
		r: "3",
		key: "1v7zrd"
	}]]
};
__iconData$11.node;
var Settings = createLucideIcon(__iconData$11);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/settings-2.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$10 = {
	name: "settings-2",
	size: 24,
	node: [
		["path", {
			d: "M14 17H5",
			key: "gfn3mx"
		}],
		["path", {
			d: "M19 7h-9",
			key: "6i9tg"
		}],
		["circle", {
			cx: "17",
			cy: "17",
			r: "3",
			key: "18b49y"
		}],
		["circle", {
			cx: "7",
			cy: "7",
			r: "3",
			key: "dfmy0x"
		}]
	]
};
__iconData$10.node;
var Settings2 = createLucideIcon(__iconData$10);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/shield-check.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$9 = {
	name: "shield-check",
	size: 24,
	node: [["path", {
		d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
		key: "oel41y"
	}], ["path", {
		d: "m9 12 2 2 4-4",
		key: "dzmm74"
	}]]
};
__iconData$9.node;
var ShieldCheck = createLucideIcon(__iconData$9);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/sparkles.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$8 = {
	name: "sparkles",
	size: 24,
	node: [
		["path", {
			d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
			key: "1s2grr"
		}],
		["path", {
			d: "M20 2v4",
			key: "1rf3ol"
		}],
		["path", {
			d: "M22 4h-4",
			key: "gwowj6"
		}],
		["circle", {
			cx: "4",
			cy: "20",
			r: "2",
			key: "6kqj1y"
		}]
	],
	aliases: ["stars"]
};
__iconData$8.node;
var Sparkles = createLucideIcon(__iconData$8);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/sun.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$7 = {
	name: "sun",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "4",
			key: "4exip2"
		}],
		["path", {
			d: "M12 2v2",
			key: "tus03m"
		}],
		["path", {
			d: "M12 20v2",
			key: "1lh1kg"
		}],
		["path", {
			d: "m4.93 4.93 1.41 1.41",
			key: "149t6j"
		}],
		["path", {
			d: "m17.66 17.66 1.41 1.41",
			key: "ptbguv"
		}],
		["path", {
			d: "M2 12h2",
			key: "1t8f8n"
		}],
		["path", {
			d: "M20 12h2",
			key: "1q8mjw"
		}],
		["path", {
			d: "m6.34 17.66-1.41 1.41",
			key: "1m8zz5"
		}],
		["path", {
			d: "m19.07 4.93-1.41 1.41",
			key: "1shlcs"
		}]
	]
};
__iconData$7.node;
var Sun = createLucideIcon(__iconData$7);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/triangle-alert.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$6 = {
	name: "triangle-alert",
	size: 24,
	node: [
		["path", {
			d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
			key: "wmoenq"
		}],
		["path", {
			d: "M12 9v4",
			key: "juzpu7"
		}],
		["path", {
			d: "M12 17h.01",
			key: "p32p05"
		}]
	],
	aliases: ["alert-triangle"]
};
__iconData$6.node;
var TriangleAlert = createLucideIcon(__iconData$6);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/undo-2.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$5 = {
	name: "undo-2",
	size: 24,
	node: [["path", {
		d: "M9 14 4 9l5-5",
		key: "102s5s"
	}], ["path", {
		d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",
		key: "f3b9sd"
	}]]
};
__iconData$5.node;
var Undo2 = createLucideIcon(__iconData$5);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/user-round.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$4 = {
	name: "user-round",
	size: 24,
	node: [["circle", {
		cx: "12",
		cy: "8",
		r: "5",
		key: "1hypcn"
	}], ["path", {
		d: "M20 21a8 8 0 0 0-16 0",
		key: "rfgkzh"
	}]],
	aliases: ["user-2"]
};
__iconData$4.node;
var UserRound = createLucideIcon(__iconData$4);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/video-off.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$3 = {
	name: "video-off",
	size: 24,
	node: [
		["path", {
			d: "M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196",
			key: "w8jjjt"
		}],
		["path", {
			d: "M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2",
			key: "1xawa7"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}]
	]
};
__iconData$3.node;
var VideoOff = createLucideIcon(__iconData$3);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/video.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$2 = {
	name: "video",
	size: 24,
	node: [["path", {
		d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
		key: "ftymec"
	}], ["rect", {
		x: "2",
		y: "6",
		width: "14",
		height: "12",
		rx: "2",
		key: "158x01"
	}]]
};
__iconData$2.node;
var Video = createLucideIcon(__iconData$2);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/wifi-off.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData$1 = {
	name: "wifi-off",
	size: 24,
	node: [
		["path", {
			d: "M12 20h.01",
			key: "zekei9"
		}],
		["path", {
			d: "M8.5 16.429a5 5 0 0 1 7 0",
			key: "1bycff"
		}],
		["path", {
			d: "M5 12.859a10 10 0 0 1 5.17-2.69",
			key: "1dl1wf"
		}],
		["path", {
			d: "M19 12.859a10 10 0 0 0-2.007-1.523",
			key: "4k23kn"
		}],
		["path", {
			d: "M2 8.82a15 15 0 0 1 4.177-2.643",
			key: "1grhjp"
		}],
		["path", {
			d: "M22 8.82a15 15 0 0 0-11.288-3.764",
			key: "z3jwby"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}]
	]
};
__iconData$1.node;
var WifiOff = createLucideIcon(__iconData$1);
//#endregion
//#region node_modules/lucide-react/dist/esm/icons/x.mjs
/**
* @license lucide-react v1.59.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var __iconData = {
	name: "x",
	size: 24,
	node: [["path", {
		d: "M18 6 6 18",
		key: "1bl5f8"
	}], ["path", {
		d: "m6 6 12 12",
		key: "d8bk6v"
	}]]
};
__iconData.node;
var X = createLucideIcon(__iconData);
//#endregion
export { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, AudioLines, Bot, Boxes, Brain, Camera, CameraOff, CircleAlert, CircleCheck, CircleStop, Clapperboard, CloudCog, ExternalLink, FolderKanban, Image, ImagePlus, LayoutTemplate, LogIn, Menu, Mic, MicOff, MonitorPlay, Moon, Palette, Paperclip, PenTool, PhoneOff, Plug, Radio, Redo2, RefreshCw, Search, Send, Settings, Settings2, ShieldCheck, Sparkles, Sun, TriangleAlert, Undo2, UserRound, Video, VideoOff, WifiOff, X };
