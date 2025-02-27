/**
 * WordPress dependencies
 */
import { useEffect, useState, useMemo, useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	SlotFillProvider,
	Popover,
	Button,
	Notice,
} from '@wordpress/components';
import { EntityProvider, store as coreStore } from '@wordpress/core-data';
import { BlockContextProvider, BlockBreadcrumb } from '@wordpress/block-editor';
import {
	FullscreenMode,
	InterfaceSkeleton,
	ComplementaryArea,
	store as interfaceStore,
} from '@wordpress/interface';
import {
	EditorNotices,
	EditorSnackbars,
	EntitiesSavedStates,
	UnsavedChangesWarning,
	store as editorStore,
} from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { PluginArea } from '@wordpress/plugins';
import { ShortcutProvider } from '@wordpress/keyboard-shortcuts';

/**
 * Internal dependencies
 */
import Header from '../header';
import { SidebarComplementaryAreaFills } from '../sidebar';
import BlockEditor from '../block-editor';
import KeyboardShortcuts from '../keyboard-shortcuts';
import NavigationSidebar from '../navigation-sidebar';
import URLQueryController from '../url-query-controller';
import InserterSidebar from '../secondary-sidebar/inserter-sidebar';
import ListViewSidebar from '../secondary-sidebar/list-view-sidebar';
import ErrorBoundary from '../error-boundary';
import { store as editSiteStore } from '../../store';
import { GlobalStylesRenderer } from './global-styles-renderer';
import { GlobalStylesProvider } from '../global-styles/global-styles-provider';

const interfaceLabels = {
	secondarySidebar: __( 'Block Library' ),
	drawer: __( 'Navigation Sidebar' ),
};

function Editor( { initialSettings, onError } ) {
	const {
		isInserterOpen,
		isListViewOpen,
		sidebarIsOpened,
		settings,
		entityId,
		templateType,
		page,
		template,
		templateResolved,
		isNavigationOpen,
	} = useSelect( ( select ) => {
		const {
			isInserterOpened,
			isListViewOpened,
			getSettings,
			getEditedPostType,
			getEditedPostId,
			getPage,
			isNavigationOpened,
		} = select( editSiteStore );
		const { hasFinishedResolution, getEntityRecord } = select( coreStore );
		const postType = getEditedPostType();
		const postId = getEditedPostId();

		// The currently selected entity to display. Typically template or template part.
		return {
			isInserterOpen: isInserterOpened(),
			isListViewOpen: isListViewOpened(),
			sidebarIsOpened: !! select(
				interfaceStore
			).getActiveComplementaryArea( editSiteStore.name ),
			settings: getSettings(),
			templateType: postType,
			page: getPage(),
			template: postId
				? getEntityRecord( 'postType', postType, postId )
				: null,
			templateResolved: postId
				? hasFinishedResolution( 'getEntityRecord', [
						'postType',
						postType,
						postId,
				  ] )
				: false,
			entityId: postId,
			isNavigationOpen: isNavigationOpened(),
		};
	}, [] );
	const { updateEditorSettings } = useDispatch( editorStore );
	const { setPage, setIsInserterOpened, updateSettings } = useDispatch(
		editSiteStore
	);
	useEffect( () => {
		updateSettings( initialSettings );
	}, [] );

	// Keep the defaultTemplateTypes in the core/editor settings too,
	// so that they can be selected with core/editor selectors in any editor.
	// This is needed because edit-site doesn't initialize with EditorProvider,
	// which internally uses updateEditorSettings as well.
	const { defaultTemplateTypes, defaultTemplatePartAreas } = settings;
	useEffect( () => {
		updateEditorSettings( {
			defaultTemplateTypes,
			defaultTemplatePartAreas,
		} );
	}, [ defaultTemplateTypes, defaultTemplatePartAreas ] );

	const [
		isEntitiesSavedStatesOpen,
		setIsEntitiesSavedStatesOpen,
	] = useState( false );
	const openEntitiesSavedStates = useCallback(
		() => setIsEntitiesSavedStatesOpen( true ),
		[]
	);
	const closeEntitiesSavedStates = useCallback( () => {
		setIsEntitiesSavedStatesOpen( false );
	}, [] );

	const blockContext = useMemo(
		() => ( {
			...page?.context,
			queryContext: [
				page?.context.queryContext || { page: 1 },
				( newQueryContext ) =>
					setPage( {
						...page,
						context: {
							...page?.context,
							queryContext: {
								...page?.context.queryContext,
								...newQueryContext,
							},
						},
					} ),
			],
		} ),
		[ page?.context ]
	);

	useEffect( () => {
		if ( isNavigationOpen ) {
			document.body.classList.add( 'is-navigation-sidebar-open' );
		} else {
			document.body.classList.remove( 'is-navigation-sidebar-open' );
		}
	}, [ isNavigationOpen ] );

	// Don't render the Editor until the settings are set and loaded
	const isReady =
		settings?.siteUrl &&
		templateType !== undefined &&
		entityId !== undefined;

	const secondarySidebar = () => {
		if ( isInserterOpen ) {
			return <InserterSidebar />;
		}
		if ( isListViewOpen ) {
			return <ListViewSidebar />;
		}
		return null;
	};

	return (
		<>
			<URLQueryController />
			{ isReady && (
				<ShortcutProvider>
					<SlotFillProvider>
						<EntityProvider kind="root" type="site">
							<EntityProvider
								kind="postType"
								type={ templateType }
								id={ entityId }
							>
								<GlobalStylesProvider>
									<BlockContextProvider
										value={ blockContext }
									>
										<GlobalStylesRenderer />
										<ErrorBoundary onError={ onError }>
											<FullscreenMode isActive />
											<UnsavedChangesWarning />
											<KeyboardShortcuts.Register />
											<SidebarComplementaryAreaFills />
											<InterfaceSkeleton
												labels={ interfaceLabels }
												drawer={ <NavigationSidebar /> }
												secondarySidebar={ secondarySidebar() }
												sidebar={
													sidebarIsOpened && (
														<ComplementaryArea.Slot scope="core/edit-site" />
													)
												}
												header={
													<Header
														openEntitiesSavedStates={
															openEntitiesSavedStates
														}
													/>
												}
												notices={ <EditorSnackbars /> }
												content={
													<>
														<EditorNotices />
														{ template && (
															<BlockEditor
																setIsInserterOpen={
																	setIsInserterOpened
																}
															/>
														) }
														{ templateResolved &&
															! template &&
															settings?.siteUrl &&
															entityId && (
																<Notice
																	status="warning"
																	isDismissible={
																		false
																	}
																>
																	{ __(
																		"You attempted to edit an item that doesn't exist. Perhaps it was deleted?"
																	) }
																</Notice>
															) }
														<KeyboardShortcuts
															openEntitiesSavedStates={
																openEntitiesSavedStates
															}
														/>
													</>
												}
												actions={
													<>
														{ isEntitiesSavedStatesOpen ? (
															<EntitiesSavedStates
																close={
																	closeEntitiesSavedStates
																}
															/>
														) : (
															<div className="edit-site-editor__toggle-save-panel">
																<Button
																	variant="secondary"
																	className="edit-site-editor__toggle-save-panel-button"
																	onClick={
																		openEntitiesSavedStates
																	}
																	aria-expanded={
																		false
																	}
																>
																	{ __(
																		'Open save panel'
																	) }
																</Button>
															</div>
														) }
													</>
												}
												footer={ <BlockBreadcrumb /> }
											/>
											<Popover.Slot />
											<PluginArea />
										</ErrorBoundary>
									</BlockContextProvider>
								</GlobalStylesProvider>
							</EntityProvider>
						</EntityProvider>
					</SlotFillProvider>
				</ShortcutProvider>
			) }
		</>
	);
}
export default Editor;
