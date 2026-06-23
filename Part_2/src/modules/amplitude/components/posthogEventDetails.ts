export const POSTHOG_PAGES = {
    COLLECTION_PAGE: 'collection_page',
    FLIGHT_PAGE: 'flight_page',
    /** Full-page + embedded itinerary (board / calendar / map / mobile) */
    ITINERARY_VIEW_PAGE: 'itinerary_view_page',
    /** Meta events: first data load, wizard-style creation trigger */
    ITINERARY_INTERNAL_PAGE: 'itinerary',
    BUDGET_TAB: 'budget_tab',
    /** Activities tab → Explore subview (Top 10 / Best Things / Quick Bites / Listing). */
    ACTIVITIES_EXPLORE: 'activities_explore',
    /** Vertical reels viewer launched from Top 10 (mobile) or sneak peek thumbnails. */
    ACTIVITIES_REELS: 'activities_reels',
    /** Sneak peek bottom sheet (mobile) / side drawer (desktop). */
    ACTIVITIES_SNEAK_PEEK: 'activities_sneak_peek'
} as const

export const POSTHOG_ACTIONS = {
    CLICK: 'click',
    /** Slot / day dropped on board (e.g. opens “choose time” or reorders days) */
    DRAG_DROP: 'drag_drop',
    /** Persisted placement after time choice + API */
    PLACEMENT_SAVE: 'placement_save'
} as const

export const POSTHOG_EVENTS = {
    // -------- Collection Page --------
    COLLECTION_TAB_CLICK: 'collection_tab_click',
    OVERVIEW_VIDEO_CLICK: 'overview_video_click',
    OVERVIEW_YOUTUBE_VIDEO_CLICK: 'overview_youtube_video_click',
    EXPERIENCE_SHORTLIST_ADD: 'experience_card_shortlist_add_click',
    EXPERIENCE_SHORTLIST_REMOVE: 'experience_card_shortlist_remove_click',
    EXPERIENCE_CARD_IMAGE_CLICK: 'experience_cardimg_click',
    EXPERIENCE_EDIT_DATE_CLICK: 'experience_edit_date_click',
    EXPERIENCE_CITY_CHANGE: 'experience_city_change',
    EXPERIENCE_CARD_MAPS_CLICK: 'experience_card_maps_click',
    EXPERIENCE_VIEW_DETAILS_CLICK: 'experience_card_view_details_click',
    STAYS_SHORTLIST_TOGGLE: 'stays_card_shortlist_toggle',
    STAYS_EDIT_DATE_CLICK: 'stays_edit_date_click',
    STAYS_VIEW_DEAL_CLICKED: 'stays_view_deal_clicked',
    STAYS_VIEW_DEAL_MAP_CLICKED: 'stays_view_deal_map_clicked',
    EXPERIENCE_VIEW_DETAILS_MAP_CLICKED: 'experience_view_details_map_clicked',
    RESTAURANT_DIRECTIONS_MAP_CLICKED: 'restaurant_directions_map_clicked',
    RESTAURANT_INSTAGRAM_MAP_CLICKED: 'restaurant_instagram_map_clicked',
    PROVIDER_BOOK_CLICK: 'provider_book_click',
    FOOD_CARD_INSTAGRAM_CLICK: 'food_card_instagram_click',
    FOOD_CARD_MAPS_CLICK: 'food_card_maps_click',
    HEADER_BUY_NOW_CLICK: 'header_buy_now_click',
    COLLECTION_CUSTOMIZE_TRIP_CLICK: 'collection_customize_trip_click',
    COLLECTION_START_PLANNING_CLICK: 'collection_start_planning_click',

    //------------- Flight page ------------
    FLIGHT_SEARCH_SUBMIT: 'flight_search_submit',
    FLIGHT_SORT_CLICK: 'flight_sort_click',
    FLIGHT_CARD_CLICK: 'flight_card_click',
    FLIGHT_DEALS_CLICK: 'flight_deals_click',
    FLIGHT_SELECT_CLICK: 'flight_select_click',
    FLIGHT_PROVIDER_BOOK_CLICK: 'flight_provider_book_click',

    // -------- Stay card --------
    STAY_VIEW_DEAL_CLICK: 'stay_card_view_deal_click',
    // -------- Collections page / CTA cards --------
    COLLECTIONS_PAGE_VIEW: 'collections_page_view',
    COLLECTION_CTA_CLICK: 'collection_cta_click',

    // -------- Overview / Daily highlights --------
    TRIPBOARD_DAILY_HIGHLIGHTS_DAY_CLICK: 'tripboard_daily_highlights_day_click',
    TRIPBOARD_DAILY_HIGHLIGHTS_VIEW_FULL_ITINERARY_CLICK: 'tripboard_daily_highlights_view_full_itinerary_click',

    // -------- Itinerary tab (full page + embedded in tripboard / collections) --------
    /** Kept for PostHog continuity — use with ITINERARY_INTERNAL_PAGE */
    ITINERARY_META_LOAD_BUTTON_NAME: 'itinerary_loaded',
    ITINERARY_META_LOAD_SUCCESS_ACTION: 'itinerary_load_success',
    ITINERARY_META_CREATE_BUTTON_NAME: 'create_itinerary',
    ITINERARY_META_CREATION_TRIGGERED_ACTION: 'itinerary_creation_triggered',
    ITINERARY_RECREATE_CLICK: 'recreate_itinerary',
    ITINERARY_HEADER_ADD_SLOT_CLICK: 'header_add_slot',
    ITINERARY_SHARE_CLICK: 'share_button',
    ITINERARY_VIEW_MODE_CLICK: 'itinerary_view_mode_click',
    ITINERARY_DESKTOP_MAP_DAY_PILL_CLICK: 'itinerary_desktop_map_day_pill_click',
    ITINERARY_KANBAN_OPEN_MAP_FROM_COLUMN_CLICK: 'itinerary_kanban_open_map_from_column_click',
    ITINERARY_CALENDAR_DAY_HEADER_MAP_CLICK: 'itinerary_calendar_day_header_map_click',
    ITINERARY_HEADER_CREATE_TRIPBOARD_CLICK: 'itinerary_header_create_tripboard_click',
    ITINERARY_HEADER_CLONE_CLICK: 'itinerary_header_clone_click',
    ITINERARY_HEADER_CLONE_FROM_LINK_CLICK: 'itinerary_header_clone_from_link_click',
    ITINERARY_SIDEBAR_WISHLIST_TOGGLE: 'itinerary_sidebar_wishlist_toggle',
    ITINERARY_MOBILE_DAY_PILL_CLICK: 'itinerary_mobile_day_pill_click',
    ITINERARY_MOBILE_MAP_VIEW_CLICK: 'itinerary_mobile_map_view_click',
    ITINERARY_MOBILE_LIST_VIEW_CLICK: 'itinerary_mobile_list_view_click',
    ITINERARY_MOBILE_ROUTE_OVERVIEW_TOGGLE: 'itinerary_mobile_route_overview_toggle',
    ITINERARY_MOBILE_MAP_DAY_NAV_CLICK: 'itinerary_mobile_map_day_nav_click',
    ITINERARY_DESKTOP_CARD_VIEW_MAP_CLICK: 'itinerary_desktop_card_view_map_click',
    ITINERARY_MOBILE_CARD_VIEW_MAP_CLICK: 'itinerary_mobile_card_view_map_click',
    ITINERARY_MOBILE_SLOT_CARD_OPEN: 'itinerary_mobile_slot_card_open',
    ITINERARY_MOBILE_SNEAK_PEEK_OPEN_MAP_CLICK: 'itinerary_mobile_sneak_peek_open_map_click',

    // -------- Itinerary kanban: card hover toolbar & day header --------
    ITINERARY_KANBAN_EDIT_SLOT_CLICK: 'itinerary_kanban_edit_slot_click',
    ITINERARY_KANBAN_DELETE_SLOT_CLICK: 'itinerary_kanban_delete_slot_click',
    ITINERARY_KANBAN_SLOT_TOOLBAR_MAP_CLICK: 'itinerary_kanban_slot_toolbar_map_click',
    ITINERARY_KANBAN_SLOT_AI_CLICK: 'itinerary_kanban_slot_ai_click',
    ITINERARY_KANBAN_DAY_MENU_ADD_BEFORE_CLICK: 'itinerary_kanban_day_menu_add_before_click',
    ITINERARY_KANBAN_DAY_MENU_ADD_AFTER_CLICK: 'itinerary_kanban_day_menu_add_after_click',
    ITINERARY_KANBAN_DAY_MENU_CLEAR_COLUMN_CLICK: 'itinerary_kanban_day_menu_clear_column_click',
    ITINERARY_KANBAN_DAY_MENU_DELETE_COLUMN_CLICK: 'itinerary_kanban_day_menu_delete_column_click',
    ITINERARY_KANBAN_DAY_AI_INTENT_CLICK: 'itinerary_kanban_day_ai_intent_click',
    ITINERARY_KANBAN_DAY_HEADER_EDIT_CLICK: 'itinerary_kanban_day_header_edit_click',
    ITINERARY_KANBAN_EMPTY_DAY_ADD_CLICK: 'itinerary_kanban_empty_day_add_click',
    ITINERARY_KANBAN_EMPTY_DAY_FIND_THINGS_CLICK: 'itinerary_kanban_empty_day_find_things_click',
    ITINERARY_KANBAN_ADD_SLOT_BOTTOM_CLICK: 'itinerary_kanban_add_slot_bottom_click',
    ITINERARY_KANBAN_SLOT_DRAG_DROP_PENDING: 'itinerary_kanban_slot_drag_drop_pending',
    ITINERARY_KANBAN_DAY_REORDER_DROP: 'itinerary_kanban_day_reorder_drop',
    ITINERARY_KANBAN_PLACEMENT_TIME_PRESET_PICK: 'itinerary_kanban_placement_time_preset_pick',
    ITINERARY_KANBAN_PLACEMENT_CUSTOM_TIME_CLICK: 'itinerary_kanban_placement_custom_time_click',
    ITINERARY_KANBAN_PLACEMENT_CANCEL_CLICK: 'itinerary_kanban_placement_cancel_click',
    ITINERARY_KANBAN_PLACEMENT_SAVE_SUCCESS: 'itinerary_kanban_placement_save_success',

    // -------- Mobile slot options menu (⋯) --------
    ITINERARY_MOBILE_SLOT_MENU_OPEN: 'itinerary_mobile_slot_menu_open',
    ITINERARY_MOBILE_SLOT_MENU_VIEW_DETAILS_CLICK: 'itinerary_mobile_slot_menu_view_details_click',
    ITINERARY_MOBILE_SLOT_MENU_EDIT_CLICK: 'itinerary_mobile_slot_menu_edit_click',
    ITINERARY_MOBILE_SLOT_MENU_DELETE_CLICK: 'itinerary_mobile_slot_menu_delete_click',
    ITINERARY_MOBILE_SLOT_MENU_AI_TELL_CLICK: 'itinerary_mobile_slot_menu_ai_tell_click',
    ITINERARY_MOBILE_SLOT_MENU_AI_ALTERNATIVES_CLICK: 'itinerary_mobile_slot_menu_ai_alternatives_click',
    ITINERARY_MOBILE_SLOT_MENU_AI_CUSTOM_SUBMIT: 'itinerary_mobile_slot_menu_ai_custom_submit',

    // -------- Itinerary Stays --------
    ITINERARY_STAY_SELECT_CLICK: 'itinerary_stay_select_click',
    ITINERARY_STAY_CHANGE_HOTEL_CLICK: 'itinerary_stay_change_hotel_click',
    ITINERARY_STAY_REMOVE_CLICK: 'itinerary_stay_remove_click',
    ITINERARY_STAY_HOTEL_PICKED: 'itinerary_stay_hotel_picked',
    ITINERARY_STAY_ADDED_SUCCESS: 'itinerary_stay_added_success',
    ITINERARY_STAY_REMOVED_SUCCESS: 'itinerary_stay_removed_success',

    // -------- Budget tab --------
    BUDGET_TAB_VIEW: 'budget_tab_view',
    BUDGET_TAB_FILTER_SELECT: 'budget_tab_filter_select',
    BUDGET_TAB_RECALCULATE_CLICK: 'budget_tab_recalculate_click',
    BUDGET_TAB_FLIGHTS_SECTION_TOGGLE: 'budget_tab_flights_section_toggle',
    BUDGET_TAB_FLIGHT_EXCLUDE_CLICK: 'budget_tab_flight_exclude_click',
    BUDGET_TAB_FLIGHT_INCLUDE_CLICK: 'budget_tab_flight_include_click',
    BUDGET_TAB_FLIGHT_PROVIDERS_TOGGLE: 'budget_tab_flight_providers_toggle',
    BUDGET_TAB_FLIGHT_PROVIDER_SELECT: 'budget_tab_flight_provider_select',
    BUDGET_TAB_FLIGHT_BOOK_CLICK: 'budget_tab_flight_book_click',
    BUDGET_TAB_STAYS_SECTION_TOGGLE: 'budget_tab_stays_section_toggle',
    BUDGET_TAB_STAY_BOOK_LINK_CLICK: 'budget_tab_stay_book_link_click',
    BUDGET_TAB_STAY_ALT_PANEL_TOGGLE: 'budget_tab_stay_alt_panel_toggle',
    BUDGET_TAB_STAY_PROVIDER_SELECT: 'budget_tab_stay_provider_select',
    BUDGET_TAB_STAY_PROVIDER_LINK_CLICK: 'budget_tab_stay_provider_link_click',
    BUDGET_TAB_STAY_NAVIGATE_TO_STAYS_TAB: 'budget_tab_stay_navigate_to_stays_tab',
    BUDGET_TAB_STAY_SELECT_CLICK: 'budget_tab_stay_select_click',
    BUDGET_TAB_ACTIVITIES_SECTION_TOGGLE: 'budget_tab_activities_section_toggle',
    BUDGET_TAB_ACTIVITY_EXCLUDE_CLICK: 'budget_tab_activity_exclude_click',
    BUDGET_TAB_ACTIVITY_INCLUDE_CLICK: 'budget_tab_activity_include_click',
    BUDGET_TAB_ACTIVITY_ROW_TOGGLE: 'budget_tab_activity_row_toggle',
    BUDGET_TAB_ACTIVITY_TOUR_SELECT: 'budget_tab_activity_tour_select',
    BUDGET_TAB_ACTIVITY_TOUR_LINK_CLICK: 'budget_tab_activity_tour_link_click',
    BUDGET_TAB_ACTIVITY_BOOK_CLICK: 'budget_tab_activity_book_click',
    BUDGET_TAB_ACTIVITY_SWAP_CLICK: 'budget_tab_activity_swap_click',
    BUDGET_TAB_EXPERT_CONTACT_CLICK: 'budget_tab_expert_contact_click',
    BUDGET_TAB_ONBOARDING_VIEW: 'budget_tab_onboarding_view',
    BUDGET_TAB_ONBOARDING_DISMISS: 'budget_tab_onboarding_dismiss',
    BUDGET_TAB_CURATED_SECTION_TOGGLE: 'budget_tab_curated_section_toggle',
    BUDGET_TAB_CURATED_ITEM_TOGGLE: 'budget_tab_curated_item_toggle',
    BUDGET_TAB_CURATED_LINK_CLICK: 'budget_tab_curated_link_click',
    BUDGET_TAB_CURATED_ITEM_SAVE: 'budget_tab_curated_item_save',
    BUDGET_TAB_CURATED_ITEM_DELETE: 'budget_tab_curated_item_delete',

    // -------- Flights tab (TripBoard) --------
    /** Switching the active leg in the LegStrip. */
    FLIGHTS_TAB_LEG_SELECT: 'flights_tab_leg_select',
    /** Open the leg-edit modal in add mode (`+ Add a leg`). */
    FLIGHTS_TAB_LEG_ADD_OPEN: 'flights_tab_leg_add_open',
    /** Open the leg-edit modal in edit mode (clicking pencil on a leg pill). */
    FLIGHTS_TAB_LEG_EDIT_OPEN: 'flights_tab_leg_edit_open',
    /** Submit the leg-edit modal — fires for both add and edit. */
    FLIGHTS_TAB_LEG_SAVE: 'flights_tab_leg_save',
    /** Remove a leg via the LegEditModal's delete button. */
    FLIGHTS_TAB_LEG_REMOVE: 'flights_tab_leg_remove',
    /** Toggling between Shortlisted ↔ Explore views. */
    FLIGHTS_TAB_VIEW_TOGGLE: 'flights_tab_view_toggle',
    /** Triggering the Kayak search on Explore (initial gate). */
    FLIGHTS_TAB_EXPLORE_SEARCH_TRIGGER: 'flights_tab_explore_search_trigger',
    /** Manual refresh on the Explore results header. */
    FLIGHTS_TAB_EXPLORE_REFRESH_CLICK: 'flights_tab_explore_refresh_click',
    /** "Explore more flights / Browse" link → /flights from the Flights tab. */
    FLIGHTS_TAB_EXPLORE_BROWSE_CLICK: 'flights_tab_explore_browse_click',
    /** "Explore more stays / Browse" link → /stays from the Stays tab. */
    STAYS_TAB_EXPLORE_BROWSE_CLICK: 'stays_explore_browse_click',
    /** "Explore more activities / Browse" link → /activities from the Activities tab. */
    ACTIVITIES_TAB_EXPLORE_BROWSE_CLICK: 'activities_explore_browse_click',
    /** Sort key change (best / cheapest / fastest / earliest). */
    FLIGHTS_TAB_SORT_CHANGE: 'flights_tab_sort_change',
    /** Filter applied / cleared on the Explore filter rail / mobile sheet. */
    FLIGHTS_TAB_FILTER_CHANGE: 'flights_tab_filter_change',
    FLIGHTS_TAB_FILTERS_CLEAR: 'flights_tab_filters_clear',
    /** Heart click on a flight card — add to / remove from the leg's shortlist. */
    FLIGHTS_TAB_FLIGHT_SHORTLIST_ADD: 'flights_tab_flight_shortlist_add',
    FLIGHTS_TAB_FLIGHT_SHORTLIST_REMOVE: 'flights_tab_flight_shortlist_remove',
    /** Clicking the "Book" CTA on a flight card (affiliate redirect). */
    FLIGHTS_TAB_FLIGHT_BOOK_CLICK: 'flights_tab_flight_book_click',
    /** Expand / collapse the provider deals chip strip on a card. */
    FLIGHTS_TAB_FLIGHT_DEALS_TOGGLE: 'flights_tab_flight_deals_toggle',
    /** Clicking a specific provider deal chip (jumps to that affiliate URL). */
    FLIGHTS_TAB_FLIGHT_PROVIDER_DEAL_CLICK: 'flights_tab_flight_provider_deal_click',
    /** Internal-user only: adding / clearing the manual Skyscanner CTA. */
    FLIGHTS_TAB_MANUAL_OFFER_SAVE: 'flights_tab_manual_offer_save',
    FLIGHTS_TAB_MANUAL_OFFER_CLEAR: 'flights_tab_manual_offer_clear',

    // -------- Add to Itinerary modal (Flights) --------
    /** User clicks the "Add to Itinerary" / "In your Itinerary" CTA on a flight card.
     *  ``extra.source`` distinguishes shortlisted vs explore origin;
     *  ``extra.mode`` is ``add`` / ``edit`` / ``replace``. */
    FLIGHTS_TAB_ADD_TO_ITINERARY_OPEN: 'flights_tab_add_to_itinerary_open',
    /** Submit the modal — flight slot(s) actually persist on the itinerary. */
    FLIGHTS_TAB_ADD_TO_ITINERARY_SUBMIT: 'flights_tab_add_to_itinerary_submit',
    /** Cancel / close the modal without saving. */
    FLIGHTS_TAB_ADD_TO_ITINERARY_CANCEL: 'flights_tab_add_to_itinerary_cancel',
    /** A flight intent was handed off to the in-app assistant instead of
     *  mutating the itinerary directly. Fired right after
     *  ``triggerAssistantPrompt`` from any of the three routed flows.
     *  ``extra.scope`` is ``leg_add | flight_add | flight_replace``. */
    FLIGHTS_TAB_ASSISTANT_DISPATCH: 'flights_tab_assistant_dispatch',
    /** User clicked trash on a leg that has no underlying slot (the BE
     *  legacy-spine fallback). We show a toast instead of firing a
     *  guaranteed-404 DELETE; this event lets us measure how often the
     *  no-op path is hit so we can prioritise a backfill. */
    FLIGHTS_TAB_LEG_LEGACY_REMOVE_BLOCKED: 'flights_tab_leg_legacy_remove_blocked',

    // -------- Budget tab (Flights) — additions for the new flow --------
    /** Click "Remove" on a flight row in the Budget Tab (opens warning modal). */
    BUDGET_TAB_FLIGHT_REMOVE_CLICK: 'budget_tab_flight_remove_click',
    /** Confirm / cancel the warning modal. */
    BUDGET_TAB_FLIGHT_REMOVE_CONFIRM: 'budget_tab_flight_remove_confirm',
    BUDGET_TAB_FLIGHT_REMOVE_CANCEL: 'budget_tab_flight_remove_cancel',
    /** Cross-tab nav from Budget → Flights (empty state CTA / "Add another flight" footer). */
    BUDGET_TAB_FLIGHT_NAVIGATE_TO_FLIGHTS_TAB: 'budget_tab_flight_navigate_to_flights_tab',

    // -------- Activities Explore subview --------
    /** "Create itinerary from a video/PDF" banner tap → opens assistant + attachment picker. */
    ADD_ATTACHMENT_FROM_ATTACHMENT_CLICK: 'add_attachment_from_attachment_click',
    /** Top 10 highlights — card click on desktop list / mobile sneak. */
    ACTIVITIES_EXPLORE_TOP10_CARD_CLICK: 'activities_explore_top10_card_click',
    /** Top 10 highlights — heart toggle. `extra.next` = added | removed. */
    ACTIVITIES_EXPLORE_TOP10_SHORTLIST_TOGGLE: 'activities_explore_top10_shortlist_toggle',
    /** "See all" → all-activities listing from any carousel section. */
    ACTIVITIES_EXPLORE_SEE_ALL_CLICK: 'activities_explore_see_all_click',
    /** Best Things — card click. */
    ACTIVITIES_EXPLORE_BEST_THINGS_CARD_CLICK: 'activities_explore_best_things_card_click',
    /** Best Things — heart toggle. */
    ACTIVITIES_EXPLORE_BEST_THINGS_SHORTLIST_TOGGLE: 'activities_explore_best_things_shortlist_toggle',
    /** "Help me choose" pill (desktop header + mobile footer). */
    ACTIVITIES_EXPLORE_HELP_ME_CHOOSE_CLICK: 'activities_explore_help_me_choose_click',
    /** Quick Bites carousel — individual short thumbnail click. */
    ACTIVITIES_EXPLORE_QUICK_BITES_SHORT_CLICK: 'activities_explore_quick_bites_short_click',
    /** Bottom listing — card click. */
    ACTIVITIES_EXPLORE_LISTING_CARD_CLICK: 'activities_explore_listing_card_click',
    /** Bottom listing — heart toggle. */
    ACTIVITIES_EXPLORE_LISTING_SHORTLIST_TOGGLE: 'activities_explore_listing_shortlist_toggle',
    /** Bottom listing — sneak peek opened. */
    ACTIVITIES_EXPLORE_LISTING_SNEAKPEEK_OPEN: 'activities_explore_listing_sneakpeek_open',
    /** Filter chip toggle. `extra.type` = priority | preference. */
    ACTIVITIES_EXPLORE_FILTER_CHIP_TOGGLE: 'activities_explore_filter_chip_toggle',
    /** "For you" meta chip — clears every selected filter. */
    ACTIVITIES_EXPLORE_FILTER_CLEAR_ALL: 'activities_explore_filter_clear_all',
    /** Filter modal open. */
    ACTIVITIES_EXPLORE_FILTER_OPEN: 'activities_explore_filter_open',
    /** Sort modal open. */
    ACTIVITIES_EXPLORE_SORT_OPEN: 'activities_explore_sort_open',
    /** Smart-search row toggled on. */
    ACTIVITIES_EXPLORE_SMART_SEARCH_TOGGLE: 'activities_explore_smart_search_toggle',

    // -------- Activities Reels (vertical YouTube reels viewer) --------
    /** Reels view opened. `extra.source` = top10 | sneak_peek_shorts. */
    ACTIVITIES_REELS_OPEN: 'activities_reels_open',
    /** Reels view closed via X button or Esc. */
    ACTIVITIES_REELS_CLOSE: 'activities_reels_close',
    /** Active reel changed (user scrolled / snapped). `extra.from` / `extra.to`. */
    ACTIVITIES_REELS_ACTIVE_CHANGE: 'activities_reels_active_change',
    /** Tap to play/pause active reel. `extra.next` = play | pause. */
    ACTIVITIES_REELS_PLAY_TOGGLE: 'activities_reels_play_toggle',
    /** Mute/unmute active reel. `extra.next` = muted | unmuted. */
    ACTIVITIES_REELS_MUTE_TOGGLE: 'activities_reels_mute_toggle',
    /** Heart toggle inside reels overlay. */
    ACTIVITIES_REELS_SHORTLIST_TOGGLE: 'activities_reels_shortlist_toggle',
    /** "View details / Add to wishlist" CTA in reels footer. */
    ACTIVITIES_REELS_VIEW_DETAILS_CLICK: 'activities_reels_view_details_click',

    // -------- Sneak peek (mobile bottom sheet + desktop drawer) --------
    /** Sheet/drawer opened. */
    ACTIVITIES_SNEAK_PEEK_OPEN: 'activities_sneak_peek_open',
    /** Sheet/drawer closed via X / backdrop. */
    ACTIVITIES_SNEAK_PEEK_CLOSE: 'activities_sneak_peek_close',
    /** Heart toggle from inside the sheet. */
    ACTIVITIES_SNEAK_PEEK_SHORTLIST_TOGGLE: 'activities_sneak_peek_shortlist_toggle',
    /** "View Details" footer CTA (opens experience page). */
    ACTIVITIES_SNEAK_PEEK_VIEW_DETAILS_CLICK: 'activities_sneak_peek_view_details_click',
    /** "View on Map" footer CTA — mobile only. */
    ACTIVITIES_SNEAK_PEEK_VIEW_MAP_CLICK: 'activities_sneak_peek_view_map_click',
    /** Tap on a short thumbnail inside the sheet → opens reels. */
    ACTIVITIES_SNEAK_PEEK_SHORT_PLAY_CLICK: 'activities_sneak_peek_short_play_click',

    // -------- Activities tab — subview toggle (Explore / Shortlist / In your itinerary) --------
    /** Switch the Activities subview. `extra.view` = explore | shortlisted | my_itinerary. */
    ACTIVITIES_SUBVIEW_TOGGLE: 'activities_subview_toggle',

    // -------- Activities tab — recommendations / shortlist banner --------
    /** "Add with AI" CTA on the Shortlist-subview banner / sticky header. */
    ACTIVITIES_BANNER_ADD_WITH_AI_CLICK: 'activities_banner_add_with_ai_click',
    /** "Schedule with AI" CTA on the wishlist "schedule" banner. */
    ACTIVITIES_BANNER_SCHEDULE_WITH_AI_CLICK: 'activities_banner_schedule_with_ai_click',
    /** "Not Now" on the schedule banner (collapses it into the sticky header). */
    ACTIVITIES_BANNER_NOT_NOW_CLICK: 'activities_banner_not_now_click',
    /** X dismiss on the explore / shortlist banner. */
    ACTIVITIES_BANNER_DISMISS_CLICK: 'activities_banner_dismiss_click',

    // -------- Activities tab — country overview sections --------
    /** Top Cities carousel — "See all" → scrolls to All Cities. */
    ACTIVITIES_TOP_CITIES_SEE_ALL_CLICK: 'activities_top_cities_see_all_click',
    /** Top Cities carousel — a city card tapped. */
    ACTIVITIES_TOP_CITIES_CITY_CLICK: 'activities_top_cities_city_click',
    /** All Cities grid — a city card tapped. */
    ACTIVITIES_ALL_CITIES_CITY_CLICK: 'activities_all_cities_city_click',
    /** Watch & Discover floating CTA opened. `extra.variant` = mobile | desktop. */
    ACTIVITIES_WATCH_DISCOVER_OPEN: 'activities_watch_discover_open',

    // -------- Activities tab — Shortlist subview --------
    /** A shortlisted activity card tapped (opens sneak peek / reel). */
    ACTIVITIES_SHORTLIST_CARD_CLICK: 'activities_shortlist_card_click',
    /** Heart toggle on a shortlisted card. `extra.next` = added | removed. */
    ACTIVITIES_SHORTLIST_CARD_SHORTLIST_TOGGLE: 'activities_shortlist_card_shortlist_toggle',
    /** "Watch Reel" affordance on a shortlisted card (mobile). */
    ACTIVITIES_SHORTLIST_WATCH_REEL_CLICK: 'activities_shortlist_watch_reel_click',

    // -------- Activities tab — In Your Itinerary subview --------
    /** "Help me choose" pill on an empty itinerary day. */
    ACTIVITIES_IN_ITINERARY_HELP_ME_CHOOSE_CLICK: 'activities_in_itinerary_help_me_choose_click',
    /** A placed activity card tapped. */
    ACTIVITIES_IN_ITINERARY_CARD_CLICK: 'activities_in_itinerary_card_click',

    // -------- Itinerary wishlist (desktop overlay + mobile day-view) --------
    /** "Schedule with AI" CTA in the wishlist header / banner. */
    WISHLIST_SCHEDULE_WITH_AI_CLICK: 'wishlist_schedule_with_ai_click',
    /** Collapse / close the wishlist panel. */
    WISHLIST_CLOSE_CLICK: 'wishlist_close_click',
    /** A wishlist row card tapped (opens sneak peek). */
    WISHLIST_ROW_CLICK: 'wishlist_row_click',
    /** Heart toggle on a wishlist row. `extra.next` = added | removed. */
    WISHLIST_ROW_SHORTLIST_TOGGLE: 'wishlist_row_shortlist_toggle',
    /** Empty-state "Explore Activities" CTA. */
    WISHLIST_EXPLORE_ACTIVITIES_CLICK: 'wishlist_explore_activities_click',
    /** Empty-state "Get a ready-made itinerary" CTA. */
    WISHLIST_READY_MADE_CLICK: 'wishlist_ready_made_click',
    /** "See all" in the "More places for you" panel → Activities Explore. */
    WISHLIST_MORE_PLACES_SEE_ALL_CLICK: 'wishlist_more_places_see_all_click',
} as const
