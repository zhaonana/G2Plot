import { isString, isFunction, clamp } from '@antv/util';
import { interaction, animation, theme, scale } from '../../adaptor/common';
import { Params } from '../../core/adaptor';
import { Data } from '../../types';
import { flow } from '../../utils';
import { RANGE_TYPE, RANGE_VALUE, PERCENT, DEFAULT_COLOR } from './constant';
import { GaugeOptions } from './types';
import { processRangeData } from './utils';

/**
 * geometry 处理
 * @param params
 */
function geometry(params: Params<GaugeOptions>): Params<GaugeOptions> {
  const { chart, options } = params;
  const { percent, range, radius, innerRadius, startAngle, endAngle, axis, indicator } = options;
  const { ticks, color } = range;
  let clampTicks = ticks;
  if (!clampTicks?.length) {
    clampTicks = [0, clamp(percent, 0, 1), 1];
  }

  // 指标 & 指针
  // 如果开启在应用
  if (indicator) {
    const indicatorData = [{ [PERCENT]: clamp(percent, 0, 1) }];

    const v1 = chart.createView();
    v1.data(indicatorData);

    v1.point()
      .position(`${PERCENT}*1`)
      .shape('gauge-indicator')
      // 传入指针的样式到自定义 shape 中
      .customInfo({
        indicator,
      });

    v1.coordinate('polar', {
      startAngle,
      endAngle,
      radius: innerRadius * radius, // 外部的 innerRadius * radius = 这里的 radius
    });

    v1.axis(PERCENT, axis);
  }

  // 辅助 range
  // [{ range: 1, type: '0' }]
  const rangeData: Data = processRangeData(clampTicks as number[]);
  const v2 = chart.createView();
  v2.data(rangeData);

  const rangeColor = isString(color) ? [color, DEFAULT_COLOR] : color;

  v2.interval().position(`1*${RANGE_VALUE}`).color(RANGE_TYPE, rangeColor).adjust('stack');

  v2.coordinate('polar', {
    innerRadius,
    radius,
    startAngle,
    endAngle,
  }).transpose();

  return params;
}

/**
 * meta 配置
 * @param params
 */
function meta(params: Params<GaugeOptions>): Params<GaugeOptions> {
  return flow(
    scale({
      range: {
        min: 0,
        max: 1,
        maxLimit: 1,
        minLimit: 0,
      },
    })
  )(params);
}

/**
 * 统计指标文档
 * @param params
 */
function statistic(params: Params<GaugeOptions>): Params<GaugeOptions> {
  const { chart, options } = params;
  const { statistic, percent } = options;

  const { title, content } = statistic;
  let transformContent = content;
  if (content) {
    transformContent = {
      formatter: ({ percent }) => `${(percent * 100).toFixed(2)}%`,
      style: {
        opacity: 0.75,
        fontSize: 30,
        textAlign: 'center',
        textBaseline: 'bottom',
      },
      offsetY: -16,
      ...content,
    };
  }
  // annotation title 和 content 分别使用一个 text
  [title, transformContent].forEach((annotation) => {
    if (annotation) {
      const { formatter, style, offsetX, offsetY, rotate } = annotation;
      chart.annotation().text({
        top: true,
        position: ['50%', '100%'],
        content: isFunction(formatter) ? formatter({ percent }) : `${percent}`,
        style: isFunction(style) ? style({ percent }) : style,
        offsetX,
        offsetY,
        rotate,
      });
    }
  });

  return params;
}

/**
 * other 配置
 * @param params
 */
function other(params: Params<GaugeOptions>): Params<GaugeOptions> {
  const { chart } = params;

  chart.legend(false);
  chart.tooltip(false);

  return params;
}

/**
 * 图适配器
 * @param chart
 * @param options
 */
export function adaptor(params: Params<GaugeOptions>) {
  // flow 的方式处理所有的配置到 G2 API
  return flow(
    // animation 配置必须在 createView 之前，不然无法让子 View 生效
    animation,
    geometry,
    meta,
    statistic,
    interaction,
    theme,
    other
    // ... 其他的 adaptor flow
  )(params);
}
