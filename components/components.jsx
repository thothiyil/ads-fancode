/* eslint-disable */
// ============================================================================
// FanUI Components — Web
//
// 1:1 React port of the @ds-fancode/fanui-web components. Each component
// mirrors its source file in _source/<Component>/*.tsx but uses plain
// class-name composition against components.css (which consumes the CSS
// vars in ../../tokens.css).
//
//   Tier 1 — atoms          Text, Button, Tag, Pills, Badge, Divider, Icon
//   Tier 2 — compositions   SectionHeader, Tabs, BottomSheetHeader
//                           (CSS-only; see components.css)
//   Tier 3 — cards          SportCard
//
// Exports to `window` so host pages can reference them directly.
//
// A React Native port for the FanCode app lives at ../app/ (reserved).
// ============================================================================

const { useMemo, useCallback } = React;

/* ---------------------------------------------------------------------------
 * TOKEN ENUMS — re-exposed so consumers can reference the same names
 *   as the production TS types.
 * ------------------------------------------------------------------------- */
const FanUIButtonType = {
  CONTAINED_BRAND: 'containedBrand',
  CONTAINED_SMOOTH: 'containedSmooth',
  CONTAINED_WHITE: 'containedWhite',
  GHOST: 'ghost',
  TEXT_ONLY: 'textOnly',
  ICON_ONLY: 'iconOnly',
  ICON_WITH_DARK_BG: 'iconWithDarkBg',
  ICON_WITH_LIGHT_BG: 'iconWithLightBg',
  SECONDARY_ICON_WITH_LIGHT_BG: 'secondaryIconWithLightBg',
  SQUARE_ICON_WITH_LIGHT_BG: 'squareIconWithLightBg',
};
const FanUIButtonSize = { SMALL: 'small', LARGE: 'large' };
const ICON_BUTTON_TYPES = [
  FanUIButtonType.ICON_ONLY,
  FanUIButtonType.ICON_WITH_DARK_BG,
  FanUIButtonType.ICON_WITH_LIGHT_BG,
  FanUIButtonType.SECONDARY_ICON_WITH_LIGHT_BG,
  FanUIButtonType.SQUARE_ICON_WITH_LIGHT_BG,
];

const TagVariant = {
  NEUTRAL: 'neutral',
  DYNAMIC: 'dynamic',
  BOLD: 'bold',
  CLEAR: 'clear',
  SUBTLE: 'subtle',
};

const BadgeSize = { DOT: 'Dot', TEXT: 'Text', COUNT: 'Count' };

const DividerOrientation = { HORIZONTAL: 'horizontal', VERTICAL: 'vertical' };

const PillsType = {
  TEXT_ONLY: 'textOnly',
  TEXT_LEFT_ICON_IMAGE: 'text_leftIconImage',
  TEXT_RIGHT_ACTION: 'text_rightAction',
  TEXT_LEFT_ICON_IMAGE_RIGHT_ACTION: 'text_leftIconImage_rightAction',
};
const PillsPosition = {
  ON_ELEVATION_0: 'onElevation0',
  ON_ELEVATION_1: 'onElevation1',
  ON_IMAGE: 'onImage',
  WITH_TRANSPARENCY: 'withTransparency',
};
const PillsState = {
  UNSELECTED: 'unselected',
  SELECTED: 'selected',
  DISABLED: 'disabled',
};
const RightActionType = {
  CARET_DOWN: 'caret-down',
  CLOSE: 'close',
  CHEVRON_RIGHT: 'chevron-right',
};

/* ---------------------------------------------------------------------------
 * ICON — tiny inline-SVG loader backed by the assets/icons/web/ folder.
 *   Usage: <Icon name="play" size={24} color="white" />
 * ------------------------------------------------------------------------- */
const ICON_CACHE = {}; // name -> Promise<string>

function loadIcon(name) {
  if (!ICON_CACHE[name]) {
    ICON_CACHE[name] = fetch(`../../assets/icons/web/${name}.svg`)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
  }
  return ICON_CACHE[name];
}

const Icon = React.memo(function Icon({ name, size = 24, color, style, className }) {
  const [svg, setSvg] = React.useState('');
  React.useEffect(() => {
    let cancelled = false;
    loadIcon(name).then((raw) => {
      if (cancelled) return;
      // strip width/height so it scales to the container
      const cleaned = raw
        .replace(/\swidth="[^"]*"/i, '')
        .replace(/\sheight="[^"]*"/i, '')
        .replace(/<svg /, '<svg width="100%" height="100%" ');
      setSvg(cleaned);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        color: color || 'currentColor',
        flexShrink: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

/* ---------------------------------------------------------------------------
 * TEXT — mirrors _source/Text/Text.tsx
 *   The CSS classes in tokens.css already implement responsive typography,
 *   so we just emit .fc_text_<typography> + inline color/align overrides.
 * ------------------------------------------------------------------------- */
const VARIANT_ELEMENT = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  p: 'p', strong: 'strong', em: 'em', b: 'b', i: 'i', u: 'u',
  code: 'code', pre: 'pre', address: 'address', span: 'span',
};

const FanUIText = React.memo(function FanUIText(props) {
  const {
    children, variant = 'span', typography, color, style, className,
    testId, onClick, numberOfLines, ellipsis, maxWidth, wordBreak, whiteSpace,
    overflow, align, decoration, transform, ...rest
  } = props;
  const Element = VARIANT_ELEMENT[variant] || 'span';
  const classes = [
    typography ? `fc_text_${typography.replace(/^fc_text_/, '')}` : '',
    className || '',
  ].filter(Boolean).join(' ');

  const mergedStyle = {
    color: color || 'inherit',
    margin: 0,
    padding: 0,
    textAlign: align || undefined,
    textDecoration: decoration || undefined,
    textTransform: transform || undefined,
    maxWidth: maxWidth || undefined,
    wordBreak: wordBreak || undefined,
    whiteSpace: whiteSpace || undefined,
    overflow: overflow || undefined,
    ...(numberOfLines
      ? {
          display: '-webkit-box',
          WebkitLineClamp: numberOfLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }
      : {}),
    ...(ellipsis && !numberOfLines
      ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
      : {}),
    ...style,
  };

  return React.createElement(
    Element,
    {
      className: classes || undefined,
      style: mergedStyle,
      'data-testid': testId,
      onClick,
      ...rest,
    },
    children,
  );
});
FanUIText.displayName = 'FanUIText';

/* ---------------------------------------------------------------------------
 * BUTTON — mirrors _source/Button/Button.tsx
 * ------------------------------------------------------------------------- */
function pickButtonTextColor(type, disabled) {
  if (disabled) return 'var(--fc_colour_text_neutralLighter)';
  if (type === FanUIButtonType.CONTAINED_BRAND || type === FanUIButtonType.CONTAINED_SMOOTH) {
    return 'var(--fc_colour_text_neutralDark)';
  }
  if (type === FanUIButtonType.CONTAINED_WHITE) return 'var(--fc_colour_text_baseDark)';
  if (type === FanUIButtonType.GHOST || type === FanUIButtonType.TEXT_ONLY) {
    return 'var(--fc_colour_text_brandMedium)';
  }
  return 'var(--fc_colour_text_neutralLighter)';
}

const FanUIButton = React.memo(function FanUIButton(props) {
  const {
    type = FanUIButtonType.CONTAINED_BRAND,
    size = FanUIButtonSize.SMALL,
    disabled = false,
    fullWidth = false,
    leftIcon = false,
    rightIcon = false,
    leftIconName,
    rightIconName,
    iconName,
    buttonText = '',
    style, className, onClick, testId,
  } = props;

  const handleClick = useCallback(
    (e) => { if (!disabled && onClick) onClick(e); },
    [onClick, disabled],
  );

  const classes = [
    'fc-btn',
    `fc-btn--${type}`,
    size === FanUIButtonSize.LARGE ? 'fc-btn--lg' : 'fc-btn--sm',
    fullWidth ? 'fc-btn--full' : '',
    className || '',
  ].filter(Boolean).join(' ');

  const isIconOnly = ICON_BUTTON_TYPES.includes(type);
  const iconSize = size === FanUIButtonSize.LARGE
    ? 'var(--fc_cm_button_lg_iconSize)' : 'var(--fc_cm_button_sm_iconSize)';
  const textColor = pickButtonTextColor(type, disabled);

  return (
    <button
      data-testid={testId}
      disabled={disabled}
      className={classes}
      style={{ ...style, color: textColor }}
      onClick={handleClick}
    >
      {!isIconOnly && leftIcon && (leftIconName || iconName) && (
        <span className="fc-btn__icon" style={{ width: iconSize, height: iconSize }}>
          <Icon name={leftIconName || iconName} size="100%" color={textColor} />
        </span>
      )}
      {!isIconOnly && (
        <span className="fc-btn__text">
          <FanUIText
            typography={size === FanUIButtonSize.LARGE ? 'button_1' : 'button_2'}
            color={textColor}
            testId={`${testId}-text`}
          >
            {buttonText}
          </FanUIText>
        </span>
      )}
      {!isIconOnly && rightIcon && (rightIconName || iconName) && (
        <span className="fc-btn__icon" style={{ width: iconSize, height: iconSize }}>
          <Icon name={rightIconName || iconName} size="100%" color={textColor} />
        </span>
      )}
      {isIconOnly && iconName && (
        <span className="fc-btn__icon" style={{ width: iconSize, height: iconSize }}>
          <Icon name={iconName} size="100%" color={textColor} />
        </span>
      )}
    </button>
  );
});
FanUIButton.displayName = 'FanUIButton';

/* ---------------------------------------------------------------------------
 * TAG — mirrors _source/Tag/tag.tsx
 * ------------------------------------------------------------------------- */
const Tag = React.memo(function Tag(props) {
  const { text, variant = TagVariant.NEUTRAL, leftIconName, testId, typography, className } = props;
  const classes = [
    'fc-tag',
    `fc-tag--${variant}`,
    leftIconName ? 'fc-tag--withIcon' : '',
    className || '',
  ].filter(Boolean).join(' ');
  return (
    <div className={classes} data-testid={testId}>
      {leftIconName && (
        <span className="fc-tag__icon">
          <Icon name={leftIconName} size={16} color="var(--fc_colour_icon_neutralDark)" />
        </span>
      )}
      <FanUIText
        typography={typography ?? 'caption_2_heavyitalic'}
        color="var(--fc_colour_text_neutralDark)"
        testId={`${testId}-text`}
      >
        {text}
      </FanUIText>
    </div>
  );
});
Tag.displayName = 'Tag';

/* ---------------------------------------------------------------------------
 * BADGE — mirrors _source/Badge/badge.tsx
 * ------------------------------------------------------------------------- */
const Badge = React.memo(function Badge(props) {
  const { badgeLabel, badgeCount, size = BadgeSize.COUNT, style, className, testId, children } = props;
  const classes = [
    'fc-badge',
    size === BadgeSize.DOT ? 'fc-badge--dot'
      : size === BadgeSize.TEXT ? 'fc-badge--text'
      : 'fc-badge--count',
    className || '',
  ].filter(Boolean).join(' ');
  return (
    <div className={classes} style={style} data-testid={testId}>
      {size === BadgeSize.TEXT && (
        <FanUIText
          typography="caption_2_heavyitalic"
          color="var(--fc_colour_text_neutralDark)"
          testId={`${testId}-label-text`}
        >{badgeLabel}</FanUIText>
      )}
      {size === BadgeSize.COUNT && (
        <FanUIText
          typography="caption_2_heavyitalic"
          color="var(--fc_colour_text_neutralDark)"
          testId={`${testId}-count-text`}
        >{badgeCount}</FanUIText>
      )}
      {children}
    </div>
  );
});
Badge.displayName = 'Badge';

/* ---------------------------------------------------------------------------
 * DIVIDER — mirrors _source/Divider/Divider.tsx
 * ------------------------------------------------------------------------- */
const Divider = React.memo(function Divider(props) {
  const { thickness = '1px', length = '100%', orientation = DividerOrientation.HORIZONTAL, className } = props;
  const isH = orientation === DividerOrientation.HORIZONTAL;
  return (
    <div
      className={`fc-divider ${className || ''}`}
      style={{
        width: isH ? length : thickness,
        height: isH ? thickness : length,
      }}
    />
  );
});
Divider.displayName = 'Divider';

/* ---------------------------------------------------------------------------
 * PILLS — mirrors _source/Pills/Pills.tsx
 * ------------------------------------------------------------------------- */
function pickPillTextColor(position, state, disabled) {
  if (disabled) return 'var(--fc_colour_text_neutralLighter)';
  if (state === PillsState.SELECTED) {
    if (position === PillsPosition.ON_ELEVATION_0 || position === PillsPosition.ON_ELEVATION_1)
      return 'var(--fc_colour_text_brandMedium)';
    if (position === PillsPosition.ON_IMAGE) return 'var(--fc_colour_text_neutralDark)';
    if (position === PillsPosition.WITH_TRANSPARENCY) return 'var(--fc_colour_text_neutralMedium)';
  }
  if (state === PillsState.UNSELECTED) {
    if (position === PillsPosition.WITH_TRANSPARENCY) return 'var(--fc_colour_text_neutralLight)';
    return 'var(--fc_colour_text_neutralDark)';
  }
  return 'var(--fc_colour_text_neutralDark)';
}

function rightActionIconName(type) {
  if (type === RightActionType.CARET_DOWN) return 'caret-down';
  if (type === RightActionType.CHEVRON_RIGHT) return 'chevron-right';
  return 'close';
}

const Pills = React.memo(function Pills(props) {
  const {
    pillText = '',
    type = PillsType.TEXT_ONLY,
    position = PillsPosition.ON_ELEVATION_0,
    state = PillsState.UNSELECTED,
    style, className, onClick, testId,
    iconName, imageSrc, imageAlt,
    rightActionType = RightActionType.CLOSE,
  } = props;

  const disabled = state === PillsState.DISABLED;
  const handleClick = useCallback(
    (e) => { if (!disabled && onClick) onClick(e); },
    [onClick, disabled],
  );

  const classes = [
    'fc-pill',
    `fc-pill--${position}`,
    `fc-pill--${state}`,
    disabled ? 'fc-pill--disabled' : '',
    className || '',
  ].filter(Boolean).join(' ');

  const textColor = pickPillTextColor(position, state, disabled);
  const showLeft = [PillsType.TEXT_LEFT_ICON_IMAGE, PillsType.TEXT_LEFT_ICON_IMAGE_RIGHT_ACTION].includes(type);
  const showRight = [PillsType.TEXT_RIGHT_ACTION, PillsType.TEXT_LEFT_ICON_IMAGE_RIGHT_ACTION].includes(type);

  return (
    <div
      className={classes}
      style={{ ...style, color: textColor }}
      data-testid={testId}
      onClick={handleClick}
    >
      {showLeft && (
        <span className="fc-pill__left">
          {imageSrc
            ? <img src={imageSrc} alt={imageAlt || ''} />
            : iconName ? <Icon name={iconName} size="100%" color={textColor} /> : null}
        </span>
      )}
      <FanUIText
        typography={state === PillsState.SELECTED ? 'caption_1_heavy' : 'caption_1'}
        color={textColor}
        whiteSpace="nowrap"
        overflow="hidden"
        testId={`${testId}-pill-text`}
      >
        {pillText}
      </FanUIText>
      {showRight && (
        <span className="fc-pill__right">
          <Icon name={rightActionIconName(rightActionType)} size="100%" color={textColor} />
        </span>
      )}
    </div>
  );
});
Pills.displayName = 'Pills';

/* =============================================================================
 * TIER 3 — CARDS
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * SPORT CARD — mirrors _source/SportCard/sport-card.tsx
 * ------------------------------------------------------------------------- */
const SportCardColor = {
  ORANGE: 'var(--fc_colour_surface_brandMedium)',
  RED: 'var(--fc_colour_surface_errorMedium)',
  YELLOW: 'var(--fc_colour_surface_warningMedium)',
  BLUE: 'var(--fc_colour_surface_infoLight)',
  GREY: 'var(--fc_colour_surface_neutral_30)',
};

const SportCard = React.memo(function SportCard(props) {
  const {
    title = '',
    loading = false,
    width,
    color = SportCardColor.ORANGE,
    onPress,
    style,
    className,
    testId = 'sport-card',
  } = props;

  const Tag = onPress ? 'button' : 'article';
  const mergedStyle = { ...style, width, '--fc-sport-accent': color };

  return (
    <Tag
      className={['fc-sport', loading ? 'fc-sport--loading' : '', className].filter(Boolean).join(' ')}
      style={mergedStyle}
      data-testid={testId}
      onClick={onPress}
      disabled={loading}
      aria-disabled={loading}
    >
      {!loading && (
        <>
          <div className="fc-sport__bg-text-wrap" aria-hidden="true">
            <span className="fc-sport__bg-text">{title}</span>
          </div>
          <div className="fc-sport__hatch" aria-hidden="true" />
          <div className="fc-sport__gradient" aria-hidden="true" />
          <FanUIText typography="fc_text_display_4" color="var(--fc_colour_text_neutralDark)" className="fc-sport__title">
            {title}
          </FanUIText>
        </>
      )}
    </Tag>
  );
});
SportCard.displayName = 'SportCard';

/* ---------------------------------------------------------------------------
 * TOUR CARD — mirrors _source/TourCard/tour-card.tsx
 *   Three variants:
 *     TourCardType.DEFAULT    image only (or image + tour-name overlay if
 *                             isDefaultImage = true) + optional meta footer
 *     TourCardType.FOLLOW     adds a top-right plus/check pill that toggles
 *                             a "following" state
 *     TourCardType.WATCHLIST  swaps the meta footer for a full-width watchlist
 *                             action row (plus + label, or check + "Added")
 * ------------------------------------------------------------------------- */
const TourCardType = {
  DEFAULT: 'default',
  FOLLOW: 'follow',
  WATCHLIST: 'watchlist',
};

const TourCard = React.memo(function TourCard(props) {
  const {
    tourName = '',
    isDefaultImage = false,
    imageSource,
    metaData,
    status,
    isLoading = false,
    type = TourCardType.DEFAULT,
    style,
    className,
    onClick,
    onFollow,
    onWatchlist,
    testId = 'tour-card',
  } = props;

  const showWatchlist = type === TourCardType.WATCHLIST;
  const showFollow = type === TourCardType.FOLLOW;
  const showMeta = !!metaData && (type === TourCardType.DEFAULT || type === TourCardType.FOLLOW);

  const Tag = onClick ? 'button' : 'article';
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick && onClick(e);
      }
    },
    [onClick],
  );

  const ariaLabel = useMemo(() => {
    if (isLoading) return 'Loading tour information';
    const parts = [];
    if (tourName) parts.push(`Tour: ${tourName}`);
    if (metaData?.sport) parts.push(`Sport: ${metaData.sport}`);
    if (metaData?.tourName) parts.push(`Tour Name: ${metaData.tourName}`);
    if (metaData?.dateText) parts.push(`Dates: ${metaData.dateText}`);
    if (showFollow) parts.push(status?.isFollowing ? 'Status: Following this tour' : 'Status: Not following this tour');
    else if (showWatchlist) parts.push(status?.isAddedToWatchlist ? 'Status: Added to watchlist' : 'Status: Add to watchlist');
    return parts.join(', ');
  }, [isLoading, tourName, metaData, showFollow, showWatchlist, status]);

  const classes = [
    'fc-tour',
    `fc-tour--${type}`,
    className || '',
  ].filter(Boolean).join(' ');

  // Skeleton state
  if (isLoading) {
    return (
      <article className={classes} style={style} data-testid={testId} aria-label={ariaLabel}>
        <div className="fc-tour__skel-image" />
        {showMeta && (
          <div className="fc-tour__meta">
            <div className="fc-tour__skel-row fc-tour__skel-row--sport" />
            <div className="fc-tour__skel-row fc-tour__skel-row--name" />
            <div className="fc-tour__skel-row fc-tour__skel-row--date" />
          </div>
        )}
      </article>
    );
  }

  return (
    <Tag
      className={classes}
      style={style}
      data-testid={testId}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
    >
      <div className="fc-tour__image-wrap">
        <img
          className="fc-tour__image"
          src={imageSource}
          alt={tourName || 'Tour thumbnail'}
          data-testid={`${testId}-tour-thumbnail`}
        />
        <div className="fc-tour__ring" aria-hidden="true" />

        {showFollow && (
          <span
            role="button"
            tabIndex={0}
            className="fc-tour__follow-btn"
            onClick={(e) => { e.stopPropagation(); onFollow && onFollow(e); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onFollow && onFollow(e);
              }
            }}
            aria-label={status?.isFollowing ? 'Unfollow tour' : 'Follow tour'}
          >
            {status?.isFollowing ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </span>
        )}

        {isDefaultImage && tourName ? (
          <div className="fc-tour__name-overlay">
            <FanUIText
              typography="overline_heavyitalic"
              color="var(--fc_colour_text_neutralLight)"
              align="center"
              transform="uppercase"
              numberOfLines={2}
              testId={`${testId}-tour-name-text`}
            >
              {tourName}
            </FanUIText>
          </div>
        ) : null}
      </div>

      {showMeta && (
        <div className="fc-tour__meta">
          {metaData.sport && (
            <FanUIText
              typography="caption_2"
              color="var(--fc_colour_text_neutralLight)"
              ellipsis
              numberOfLines={1}
              testId={`${testId}-sport-name-text`}
            >{metaData.sport}</FanUIText>
          )}
          {metaData.tourName && (
            <FanUIText
              typography="caption_1_heavy"
              color="var(--fc_colour_text_neutralMedium)"
              ellipsis
              numberOfLines={1}
              testId={`${testId}-meta-tour-name-text`}
            >{metaData.tourName}</FanUIText>
          )}
          {metaData.dateText && (
            <FanUIText
              typography="caption_2"
              color="var(--fc_colour_text_neutralLight)"
              ellipsis
              numberOfLines={1}
              testId={`${testId}-tour-date-text`}
            >{metaData.dateText}</FanUIText>
          )}
        </div>
      )}

      {showWatchlist && (
        <span
          role="button"
          tabIndex={0}
          className="fc-tour__watchlist-btn"
          onClick={(e) => { e.stopPropagation(); onWatchlist && onWatchlist(e); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onWatchlist && onWatchlist(e);
            }
          }}
        >
          {status?.isAddedToWatchlist ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          <FanUIText
            typography="inlinelink_2"
            color="var(--fc_colour_text_neutralLight)"
            testId={`${testId}-add-to-watchlist-text`}
          >
            {status?.isAddedToWatchlist ? 'Added' : 'Watchlist'}
          </FanUIText>
        </span>
      )}
    </Tag>
  );
});
TourCard.displayName = 'TourCard';

/* ---------------------------------------------------------------------------
 * expose to window
 * ------------------------------------------------------------------------- */
Object.assign(window, {
  // Tier 1
  FanUIText, FanUIButton, FanUIButtonType, FanUIButtonSize,
  Tag, TagVariant,
  Badge, BadgeSize,
  Divider, DividerOrientation,
  Pills, PillsType, PillsPosition, PillsState, RightActionType,
  Icon,
  // Tier 3
  SportCard, SportCardColor,
  TourCard, TourCardType,
});
