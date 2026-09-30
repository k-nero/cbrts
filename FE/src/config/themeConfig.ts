import type { GroupBase, StylesConfig, ThemeConfig as SelectThemeConfig } from 'react-select';
import { theme, type ThemeConfig } from 'antd';

import {
  COLOR_ACCENT,
  COLOR_BG_INPUT,
  COLOR_BG_MUTED,
  COLOR_BG_RAISED,
  COLOR_BG_SUNKEN,
  COLOR_BORDER_STRONG,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  COLOR_TEXT_TERTIARY,
  HEIGHT_FORM_ITEM,
  PALETTE,
  type ThemeMode,
} from '@/constant/color';

/**
 * AntD on the EquiFreight tokens (DESIGN.md): navy and paper, gold only for the one forward action.
 * Seed tokens take raw PALETTE values, since AntD derives hover/active shades from them.
 */
const buildThemeAntd = (mode: ThemeMode): ThemeConfig => {
  const p = PALETTE[mode];
  return {
    hashed: false,
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: p.accent,
      colorSuccess: p.success,
      colorWarning: p.warning,
      colorError: p.error,
      colorInfo: p.info,
      colorLink: p.accentText,
      colorTextBase: p.textPrimary,
      colorBgBase: p.bgCanvas,
      colorBgLayout: p.bgCanvas,
      colorBgContainer: p.bgCard,
      colorBgElevated: p.bgRaised,
      colorBorder: p.borderStrong,
      colorBorderSecondary: p.border,
      fontFamily: 'Outfit, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 14,
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 4,
      controlHeight: HEIGHT_FORM_ITEM,
      boxShadow: 'none',
    },
    components: {
      Input: { colorBgContainer: p.bgInput, activeBorderColor: p.accent },
      InputNumber: { colorBgContainer: p.bgInput, activeBorderColor: p.accent },
      Select: { colorBgContainer: p.bgInput },
      DatePicker: { colorBgContainer: p.bgInput },
      Button: {
        fontWeight: 500,
        primaryColor: p.accentOn,
        colorPrimaryHover: p.accentHover,
        defaultBg: 'transparent',
        defaultBorderColor: p.borderStrong,
      },
      Checkbox: { colorPrimary: p.controlOn, colorWhite: p.bgCanvas },
      Switch: { colorPrimary: p.controlOn, colorPrimaryHover: p.textPrimary },
      Layout: {
        headerBg: p.bgCanvas,
        headerHeight: 64,
        siderBg: p.bgSunken,
        bodyBg: p.bgCanvas,
      },
      // The active item is the one place gold marks the current page (DESIGN.md, Staff sidebar).
      Menu: {
        itemBg: 'transparent',
        itemColor: p.textSecondary,
        itemHoverColor: p.textPrimary,
        itemHoverBg: p.bgMuted,
        itemSelectedColor: p.accentText,
        itemSelectedBg: p.bgMuted,
        itemHeight: 36,
        itemMarginInline: 0,
        groupTitleColor: p.textTertiary,
        horizontalItemSelectedColor: p.accentText,
        activeBarBorderWidth: 0,
      },
      Breadcrumb: {
        itemColor: p.textTertiary,
        lastItemColor: p.textPrimary,
        separatorColor: p.textTertiary,
      },
      Tabs: {
        itemActiveColor: p.textPrimary,
        itemSelectedColor: p.textPrimary,
        inkBarColor: p.accent,
      },
      Table: {
        headerBg: p.bgSunken,
        headerColor: p.textTertiary,
        headerSortActiveBg: p.bgMuted,
        headerSortHoverBg: p.bgMuted,
        rowHoverBg: p.bgMuted,
      },
    },
  };
};

export const themeAntd: Record<ThemeMode, ThemeConfig> = {
  light: buildThemeAntd('light'),
  dark: buildThemeAntd('dark'),
};

/** react-select (the kit's select fields) on the same tokens. */
export const themeSelect: SelectThemeConfig = (selectTheme) => ({
  ...selectTheme,
  borderRadius: 8,
  colors: {
    ...selectTheme.colors,
    primary: COLOR_ACCENT,
    primary25: COLOR_BG_MUTED,
    primary50: COLOR_BG_RAISED,
    neutral0: COLOR_BG_INPUT,
    neutral5: COLOR_BG_SUNKEN,
    neutral10: COLOR_BG_MUTED,
    neutral20: COLOR_BORDER_STRONG,
    neutral30: COLOR_TEXT_TERTIARY,
    neutral40: COLOR_TEXT_TERTIARY,
    neutral50: COLOR_TEXT_TERTIARY,
    neutral60: COLOR_TEXT_SECONDARY,
    neutral70: COLOR_TEXT_SECONDARY,
    neutral80: COLOR_TEXT_PRIMARY,
    neutral90: COLOR_TEXT_PRIMARY,
  },
  spacing: {
    ...selectTheme.spacing,
    controlHeight: HEIGHT_FORM_ITEM,
    baseUnit: 4,
  },
});

export const getSelectOptionStyles = <
  Option = unknown,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(): StylesConfig<Option, IsMulti, Group> => ({
  menu: (provided) => ({ ...provided, backgroundColor: COLOR_BG_RAISED }),
  option: (provided, { isFocused }) => ({
    ...provided,
    backgroundColor: isFocused ? COLOR_BG_MUTED : undefined,
    color: COLOR_TEXT_PRIMARY,
    cursor: 'pointer',
    ':active': { backgroundColor: COLOR_BG_MUTED },
  }),
});
