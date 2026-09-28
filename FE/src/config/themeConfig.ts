import type { GroupBase, StylesConfig, ThemeConfig as SelectThemeConfig } from 'react-select';
import { theme, type ThemeConfig } from 'antd';

import {
  COLOR_ACCENT,
  COLOR_ACCENT_HOVER,
  COLOR_ACCENT_ON,
  COLOR_ACCENT_TEXT,
  COLOR_BG_CANVAS,
  COLOR_BG_CARD,
  COLOR_BG_INPUT,
  COLOR_BG_MUTED,
  COLOR_BG_RAISED,
  COLOR_BG_SUNKEN,
  COLOR_BORDER,
  COLOR_BORDER_STRONG,
  COLOR_CONTROL_ON,
  COLOR_ERROR,
  COLOR_INFO,
  COLOR_SUCCESS,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  COLOR_TEXT_TERTIARY,
  COLOR_WARNING,
  HEIGHT_FORM_ITEM,
} from '@/constant/color';

/** AntD on the EquiFreight tokens (DESIGN.md): dark navy, gold only for the one forward action. */
export const themeAntd: ThemeConfig = {
  hashed: false,
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: COLOR_ACCENT,
    colorSuccess: COLOR_SUCCESS,
    colorWarning: COLOR_WARNING,
    colorError: COLOR_ERROR,
    colorInfo: COLOR_INFO,
    colorLink: COLOR_ACCENT_TEXT,
    colorTextBase: COLOR_TEXT_PRIMARY,
    colorBgBase: COLOR_BG_CANVAS,
    colorBgLayout: COLOR_BG_CANVAS,
    colorBgContainer: COLOR_BG_CARD,
    colorBgElevated: COLOR_BG_RAISED,
    colorBorder: COLOR_BORDER_STRONG,
    colorBorderSecondary: COLOR_BORDER,
    fontFamily: 'Outfit, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    controlHeight: HEIGHT_FORM_ITEM,
    boxShadow: 'none',
  },
  components: {
    Input: { colorBgContainer: COLOR_BG_INPUT, activeBorderColor: COLOR_ACCENT },
    InputNumber: { colorBgContainer: COLOR_BG_INPUT, activeBorderColor: COLOR_ACCENT },
    Select: { colorBgContainer: COLOR_BG_INPUT },
    DatePicker: { colorBgContainer: COLOR_BG_INPUT },
    Button: {
      fontWeight: 500,
      primaryColor: COLOR_ACCENT_ON,
      colorPrimaryHover: COLOR_ACCENT_HOVER,
      defaultBg: 'transparent',
      defaultBorderColor: COLOR_BORDER_STRONG,
    },
    Checkbox: { colorPrimary: COLOR_CONTROL_ON, colorWhite: COLOR_BG_CANVAS },
    Switch: { colorPrimary: COLOR_CONTROL_ON, colorPrimaryHover: COLOR_TEXT_PRIMARY },
    Layout: {
      headerBg: COLOR_BG_CANVAS,
      headerHeight: 64,
      siderBg: COLOR_BG_SUNKEN,
      bodyBg: COLOR_BG_CANVAS,
    },
    // The active item is the one place gold marks the current page (DESIGN.md, Staff sidebar).
    Menu: {
      itemBg: 'transparent',
      itemColor: COLOR_TEXT_SECONDARY,
      itemHoverColor: COLOR_TEXT_PRIMARY,
      itemHoverBg: COLOR_BG_MUTED,
      itemSelectedColor: COLOR_ACCENT_TEXT,
      itemSelectedBg: COLOR_BG_MUTED,
      itemHeight: 36,
      itemMarginInline: 0,
      groupTitleColor: COLOR_TEXT_TERTIARY,
      horizontalItemSelectedColor: COLOR_ACCENT_TEXT,
      activeBarBorderWidth: 0,
    },
    Breadcrumb: {
      itemColor: COLOR_TEXT_TERTIARY,
      lastItemColor: COLOR_TEXT_PRIMARY,
      separatorColor: COLOR_TEXT_TERTIARY,
    },
    Tabs: {
      itemActiveColor: COLOR_TEXT_PRIMARY,
      itemSelectedColor: COLOR_TEXT_PRIMARY,
      inkBarColor: COLOR_ACCENT,
    },
    Table: {
      headerBg: COLOR_BG_SUNKEN,
      headerColor: COLOR_TEXT_TERTIARY,
      headerSortActiveBg: COLOR_BG_MUTED,
      headerSortHoverBg: COLOR_BG_MUTED,
      rowHoverBg: COLOR_BG_MUTED,
    },
  },
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
