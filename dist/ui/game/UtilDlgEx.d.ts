import { TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare enum UtilDlgType {
    TEXT = 0,
    YESNO = 1,
    INPUT = 2,
    INPUT_STR = 3,
    LIST = 4,
    AVATAR = 5,
    PET = 6,
    COMBOBOX = 7,
    MLINPUT = 8,
    IMAGE = 9
}
export interface CtInfo {
    nType: number;
    nItemNo: number;
    nLine: number;
    pFont: number;
    sText: string;
    pIcon: number;
    nLeft: number;
    nTop: number;
    nWidth: number;
    nHeight: number;
    nSelect: number;
    nUnderLine: number;
    bLineChange: number;
    nFuncCode: number;
    bReward: number;
    nNpcNo: number;
    nMapNo: number;
    _iconPath?: string;
}
export interface PetInfo {
    dwTempletID: number;
    sName: string;
    nLevel: number;
    nTameness: number;
    bIsDead: number;
}
export declare class UtilDlgEx extends GamePanel {
    m_dlgType: UtilDlgType;
    m_nTemplateID: number;
    m_bNoNPC: boolean;
    m_bQuest: boolean;
    m_bMsgImage: number;
    m_bMsgImage_Img: number;
    m_ctLeft: number;
    m_ctTop: number;
    m_ctHeight: number;
    m_scrHeight: number;
    m_wndWidth: number;
    m_wndHeight: number;
    m_bScrollBar: boolean;
    m_nScrollPos: number;
    m_nSelect: number;
    m_nSelectPrev: number;
    m_nListFocus: number;
    m_nBtnFocus: number;
    m_bFinishShow: number;
    m_bTextPrev: boolean;
    m_bTextNext: boolean;
    m_bImagePrev: boolean;
    m_bImageNext: boolean;
    m_usCurImage: number;
    m_aImageList: string[];
    m_sInputDefault: string;
    m_nInputLen: number;
    m_nInputNo_Min: number;
    m_nInputNo_Max: number;
    m_nInputNo_Result: number;
    m_nInputStr_Min: number;
    m_nInputCol: number;
    m_nInputLine: number;
    m_sInputStr_Result: string;
    m_bInputStr_Passwd: boolean;
    m_bKoreanBaseLen: number;
    m_aAvatarCandidate: number[];
    m_nAvatarType: number;
    m_nAvatarIndex: number;
    m_bEquipPreview: boolean;
    m_aPetInfo: PetInfo[];
    m_nPetIndex: number;
    m_bSpeakerOnRight: boolean;
    m_bParam: number;
    m_nCurDisplayItemIndex: number;
    m_nCurDisplayTextItemPos: number;
    m_nRet: number;
    m_bTerminate: boolean;
    m_sNpcName: string;
    onResult: ((result: UtilDlgResult) => void) | null;
    _avatarNameOf: ((itemId: number) => string) | null;
    private _lines;
    private _apListCT;
    private _scrollBar;
    private _listItems;
    private _bg;
    private _contentLayer;
    private _inputValue;
    private _inputText;
    private _inputCursor;
    private _cursorBlink;
    private _uiWz;
    private _charWz;
    private _itemWz;
    private _baseWz;
    private _loader;
    private _fonts;
    private _apBtnFocus;
    private _charLook;
    private _avatarLook;
    private _petLook;
    private _petLookIndex;
    private _npcLook;
    private _npcWz;
    constructor(opts?: {
        uiWz?: WzPackage | null;
        charWz?: WzPackage | null;
        itemWz?: WzPackage | null;
        baseWz?: WzPackage | null;
        npcWz?: WzPackage | null;
        loader?: WzTextureLoader | null;
    });
    SetUtilDlgEx(dlgType: UtilDlgType, nTemplateID: number, bNoNPC: boolean, bQuest: boolean, sText?: string): void;
    SetUtilDlgEx_LIST(bReset: boolean): void;
    private _analyzeText;
    SetUtilDlgEx_TEXT(bPrev: boolean, bNext: boolean): void;
    SetUtilDlgEx_IMAGE(bPrev: boolean, bNext: boolean): void;
    SetUtilDlgEx_YESNO(): void;
    SetUtilDlgEx_MSG(bMsgImage: number, bMsgImageImg: number): void;
    SetUtilDlgEx_INPUT_STR(sStrDefault: string, nStrMin: number, nStrMax: number, bPasswd: boolean, bKoreanBaseLen: number): void;
    SetUtilDlgEx_INPUT_NO(nDefault: number, nMin: number, nMax: number, nStrMin?: number, nStrMax?: number, bPasswd?: boolean): void;
    SetUtilDlgEx_INPUT_MLSTR(sStrDefault: string, nCol: number, nLine: number): void;
    SetUtilDlgEx_AVATAR(aCandidate: number[], nAvatarType: number): void;
    SetUtilDlgEx_PET(petInfos: PetInfo[]): void;
    SetUtilDlgEx_COMBOBOX(aStr: string[]): void;
    AddTextLine(text: string, nFuncCode?: number, fontIndex?: number): void;
    AddIconLine(iconPath: string, nLeft: number, nTop: number, conditional?: boolean): void;
    AddFuncLine(nFuncCode: number, fontIndex?: number): void;
    AddDotLine(text: string, nSelect: number, fontIndex?: number): void;
    SetSpeakerOnRight(bRight: boolean): void;
    AddImageList(sImagePath: string): void;
    UpdateImage(): void;
    GetInputStr_Result(): string;
    GetInputNo_Result(): number;
    GetSelect(): number;
    GetComboBoxStr(): string;
    GetEmotionKey(key: string): number;
    OnChildNotify(nId: number, nParam1: number, nParam2: number): void;
    ValidateScroll(pCT: CtInfo | null): void;
    SetKeyFocus(nBtnFocus: number): void;
    ForcedRet(nRet: number): void;
    SetRet(nRet: number): void;
    private _doTerminate;
    private _showNotice;
    private _fireResult;
    private _layoutGen;
    private _layoutInput;
    private _layoutMLInput;
    show(): void;
    private _buildBackground;
    private _buildContent;
    private _buildTextContent;
    private _buildImageContent;
    private _buildInputContent;
    private _buildListContent;
    private get _apListCT_nSelect();
    private _buildAvatarContent;
    private _buildPetContent;
    private _buildButtons;
    private _onCreateTEXT;
    private _onCreateYESNO;
    private _onCreateINPUT;
    private _onCreateLIST;
    private _onCreateAVATAR;
    private _onCreatePET;
    private _onCreateCOMBOBOX;
    private _onCreateMLINPUT;
    private _onCreateIMAGE;
    private static readonly BTN_WZ_MAP;
    private _makeButton;
    OnButtonClicked(nId: number): void;
    onKeyPress(key: string): boolean;
    private _handleInputKey;
    private _updateInputDisplay;
    private _selectListItem;
    private _refreshListVisuals;
    private _updateListScroll;
    private _moveSelection;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    handleMouseMove(x: number, y: number): void;
    update(dt: number): void;
    private _rebuildTypewriterText;
    destroy(): void;
    GetFont(index: number): TextStyle;
}
export type UtilDlgResult = {
    type: 'ok';
} | {
    type: 'cancel';
} | {
    type: 'yes';
} | {
    type: 'no';
} | {
    type: 'prev';
} | {
    type: 'next';
};
//# sourceMappingURL=UtilDlgEx.d.ts.map