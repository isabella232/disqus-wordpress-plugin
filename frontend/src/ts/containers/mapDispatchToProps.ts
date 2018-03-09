import * as moment from 'moment';
import * as Redux from 'redux';
import {
    changeInstallStateAction,
    setMessageAction,
    setValueAction,
    toggleValueAction,
    updateAdminOptionsAction,
    updateExportPostLogAction,
    updateLocalOptionAction,
    updateSyncStatusAction,
} from '../actions';
import { DisqusApi } from '../DisqusApi';
import { IAdminOptions } from '../reducers/AdminOptions';
import {
    ExportLogStaus,
    InstallationState,
} from '../reducers/AdminState';
import { createRandomToken } from '../utils';
import WordPressCommentExporter from '../WordPressCommentExporter';
import {
    IRestResponse,
    WordPressRestApi,
} from '../WordPressRestApi';

const UPDATABLE_FIELDS: string[] = [
    'disqus_forum_url',
    'disqus_public_key',
    'disqus_secret_key',
    'disqus_admin_access_token',
    'disqus_sso_button',
    'disqus_sso_enabled',
    'disqus_sync_token',
    'disqus_render_js',
];

const valueFromInput = (element: HTMLInputElement): string => {
    const isCheckbox: boolean = element.type === 'checkbox';

    let value: string;
    if (isCheckbox)
        value = element.checked ? '1' : '';
    else
        value = element.value;

    return value;
};

const mapDispatchToProps = (dispatch: Redux.Dispatch<Redux.Action>) => {
    const handleClearMessage = (event: React.SyntheticEvent<HTMLButtonElement>): void => {
        dispatch(setMessageAction(null));
    };
    return {
        onCopyText: (elementId: string): void => {
            try {
                const element: HTMLInputElement = window.document.getElementById(elementId) as HTMLInputElement;
                if (element) {
                    element.select();
                    window.document.execCommand('copy');
                }
            } catch (err) {
                // Continue
            }
        },
        onDateSelectorInputchange: (key: string, event: React.SyntheticEvent<HTMLInputElement>): void => {
            const value: string = valueFromInput(event.currentTarget);
            dispatch(setValueAction(key, value));
        },
        onGenerateRandomSyncToken: (event: React.SyntheticEvent<HTMLAnchorElement>): void => {
            event.preventDefault();

            const newToken = createRandomToken();
            dispatch(updateLocalOptionAction('disqus_sync_token', newToken));
        },
        onInputChange: (key: string, event: React.SyntheticEvent<HTMLInputElement>): void => {
            const value: string = valueFromInput(event.currentTarget);
            dispatch(updateLocalOptionAction(key, value));
        },
        onSubmitExportCommentsForm: (event: React.SyntheticEvent<HTMLFormElement>): void => {
            event.preventDefault();

            const exporter: WordPressCommentExporter = new WordPressCommentExporter(dispatch);

            exporter.startExportPosts();
        },
        onSubmitManualSyncForm: (event: React.SyntheticEvent<HTMLFormElement>) => {
            event.preventDefault();

            const rangeStartInput: HTMLInputElement =
                event.currentTarget.elements.namedItem('manualSyncRangeStart') as HTMLInputElement;

            const rangeEndInput: HTMLInputElement =
                event.currentTarget.elements.namedItem('manualSyncRangeEnd') as HTMLInputElement;

            const getApiDateString = (input: HTMLInputElement) => {
                const dateValue: string = input && input.value;
                const timestamp = moment(dateValue).endOf('day').toISOString();

                return timestamp;
            };
            const startDate: string = getApiDateString(rangeStartInput);
            const endDate: string = getApiDateString(rangeEndInput);

            // TODO:
            // 1. Create Disqus API instance
            // 2. Make a request to posts/list with the start/end dates
            // 3. For each comment, make a request to the local sync API
        },
        onSubmitSiteForm: (event: React.SyntheticEvent<HTMLFormElement>) => {
            event.preventDefault();

            const fields = UPDATABLE_FIELDS.reduce((previousValue: any, currentIdKey: string): any => {
                if (currentIdKey in event.currentTarget.elements) {
                    const currentField: Element | HTMLCollection = event.currentTarget.elements.namedItem(currentIdKey);
                    const currentInputElement = currentField as HTMLInputElement;
                    const value: string = valueFromInput(currentInputElement);

                    return (Object as any).assign({
                        [currentInputElement.name]: value,
                    }, previousValue);
                }
                return previousValue;
            }, {});

            WordPressRestApi.instance.pluginRestPost(
                'settings',
                fields,
                (response: IRestResponse<IAdminOptions>): void => {
                    if (!response)
                        return;

                    if (response.code !== 'OK') {
                        dispatch(setMessageAction({
                            onDismiss: handleClearMessage,
                            text: response.message,
                            type: 'error',
                        }));
                        return;
                    }

                    dispatch(updateAdminOptionsAction(response.data));
                    dispatch(setMessageAction({
                        onDismiss: handleClearMessage,
                        text: __('Changes saved successfully.'),
                        type: 'success',
                    }));
                    dispatch(toggleValueAction('isSiteFormLocked'));
                },
            );
        },
        onSubmitSyncConfigForm: (event: React.SyntheticEvent<HTMLFormElement>): void => {
            event.preventDefault();

            const endpoint: string = event.currentTarget.name;

            WordPressRestApi.instance.pluginRestPost(endpoint, null, (response: IRestResponse<IAdminOptions>): void => {
                if (!response)
                    return;

                if (response.code !== 'OK') {
                    dispatch(setMessageAction({
                        onDismiss: handleClearMessage,
                        text: response.message,
                        type: 'error',
                    }));
                    return;
                }

                dispatch(updateSyncStatusAction(response.data));
                dispatch(setMessageAction({
                    onDismiss: handleClearMessage,
                    text: __('Changes saved successfully.'),
                    type: 'success',
                }));
            });
        },
        onToggleState: (key: string) => {
            dispatch(toggleValueAction(key));
        },
        onUpdateInstallationState: (newState: InstallationState) => {
            dispatch(changeInstallStateAction(newState));
        },
    };
};

export { UPDATABLE_FIELDS };

export default mapDispatchToProps;
