/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  ISharedMap
} from "@prague/map";
import {
  ISharedCell
} from "@prague/cell";
import {
  SharedObjectSequence
} from "@prague/sequence";

import * as React from "react";

import { ActivityItem } from 'office-ui-fabric-react/lib/ActivityItem';
import { DefaultButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import { ContextualMenuItemType, DirectionalHint } from 'office-ui-fabric-react/lib/ContextualMenu';
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { HoverCard, HoverCardType } from 'office-ui-fabric-react/lib/HoverCard';
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import { Stack } from 'office-ui-fabric-react/lib/Stack';
import { TextField } from 'office-ui-fabric-react/lib/TextField';

import { ColorPicker, getColorFromString, IColor, getColorFromHSV } from 'office-ui-fabric-react/lib/index';

import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import { MotionAnimations } from "@uifabric/fluent-theme/lib/fluent/FluentMotion"

import { getRelativeDate } from '../Utils';

import { IHistory, IBadgeType } from './';

export interface IBadgeViewProps {
  currentCell: ISharedCell;
  optionsMap: ISharedMap;
  historySequence: SharedObjectSequence<IHistory<IBadgeType>>;
}

export interface IBadgeViewState {
  isDialogVisible: boolean;
  customText: string;
  customColor: IColor;
  current: IBadgeType;
  items: any;
}

export class BadgeView extends React.Component<IBadgeViewProps, IBadgeViewState> {

  private readonly defaultColor: string = "#fff";
  private readonly animation: string = "all 0.15s ease-in";
  private readonly cardPadding: string = "16px 24px";

  constructor(props: IBadgeViewProps) {
    super(props);

    this.state = {
      isDialogVisible: false,
      current: props.currentCell.get(),
      customColor: getColorFromString(this.defaultColor),
      customText: '',
      items: this._getItemsFromOptionsMap(props.optionsMap)
    };

    this._onClick = this._onClick.bind(this);
    this._onSave = this._onSave.bind(this);
    this._closeDialog = this._closeDialog.bind(this);
    this._updateColor = this._updateColor.bind(this);
    this._updateText = this._updateText.bind(this);
    this._setCurrent = this._setCurrent.bind(this);
    this._getCurrentTimestamp = this._getCurrentTimestamp.bind(this);
    this._onRenderCard = this._onRenderCard.bind(this);

    initializeIcons();
  }

  private _onClick(_, item: IBadgeType): void {
    if (item.key == "new") {
      this.setState({ isDialogVisible: true });
    }
    else {
      this._setCurrent(item);
    }
  }

  private _onSave(): void {
    if (this.state.customText != "") {
      const newItem: IBadgeType = {
        key: this.state.customText,
        text: this.state.customText,
        iconProps: {
          iconName: 'Contact',
          style: {
            color: this.state.customColor.str
          }
        }
      };

      // add to the badge options
      this.props.optionsMap.set(this.state.customText, newItem);

      this._setCurrent(newItem);

      this.setState({ customText: "" });
    }

    this._closeDialog();
  }

  private _closeDialog(): void {
    this.setState({ isDialogVisible: false });
  }

  private _setCurrent(newItem: IBadgeType): void {
    if (newItem.key != this.state.current.key) {
      // save current value into history
      const len = this.props.historySequence.getItemCount()
      this.props.historySequence.insert(len, [{
        value: newItem,
        timestamp: new Date()
      }]);

      // set new value
      this.props.currentCell.set(newItem);
    }
  }

  private _getCurrentTimestamp(): Date {
    const len = this.props.historySequence.getItemCount()
    return this.props.historySequence.getItems(len - 1)[0].timestamp;
  }

  private _updateColor(ev: React.SyntheticEvent<HTMLElement>, colorObj: IColor) {
    this.setState({ customColor: colorObj });
  }

  private _updateText(ev: React.SyntheticEvent<HTMLElement>, newValue: string) {
    this.setState({ customText: newValue });
  }

  private _getItemsFromOptionsMap(optionsMap: ISharedMap) {
    const items = [];
    optionsMap.forEach(v => items.push(v));

    items.push({
      key: 'divider_1',
      itemType: ContextualMenuItemType.Divider
    })
    items.push({
      key: "new",
      text: "Set custom...",
      iconProps: {
        iconName: 'Add'
      },
    })

    return items;
  }

  private _getTextColor(c: IColor) {
    // https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
    return (c.r * 0.299 + c.g * 0.587 + c.b * 0.114 > 186) ?
      "#000000" : "#ffffff"
  }

  private _onRenderCard(): JSX.Element {
    let history = [];

    // add items to history in reverse order
    this.props.historySequence.getItems(0).forEach(x => {
      history.unshift(
        <ActivityItem
          activityDescription={"Set to " + x.value.text}
          timeStamp={getRelativeDate(x.timestamp)}
          activityIcon={<Icon {...x.value.iconProps} />} />
      )
    });

    return (
      <div style={{
        padding: this.cardPadding
      }}>
        {history}
      </div>
    );
  };

  componentDidMount(): void {
    this.props.currentCell.on("valueChanged", () => {
      this.setState({ current: this.props.currentCell.get() });
    });

    this.props.optionsMap.on("valueChanged", () => {
      this.setState({ items: this._getItemsFromOptionsMap(this.props.optionsMap) });
    });
  }

  public render(): JSX.Element {
    // calculate colors
    const color = getColorFromString(this.state.current.iconProps.style.color);
    const colorHover = getColorFromHSV({
      h: color.h,
      s: color.s,
      v: color.v + 5
    });
    const colorPressed = getColorFromHSV({
      h: color.h,
      s: color.s,
      v: color.v - 5
    });
    const textColor = this._getTextColor(color);

    return (
      <div style={{ animation: MotionAnimations.scaleDownIn }}>
        <HoverCard
          plainCardProps={{
            onRenderPlainCard: this._onRenderCard,
            directionalHint: DirectionalHint.rightTopEdge
          }}
          type={HoverCardType.plain}
        >
          <DefaultButton
            text={this.state.current.text}
            iconProps={{ iconName: this.state.current.iconProps.iconName }}
            menuProps={{
              isBeakVisible: false,
              shouldFocusOnMount: true,
              items: this.state.items,
              onItemClick: this._onClick
            }}
            styles={{
              label: {
                color: textColor
              },
              icon: {
                color: textColor
              },
              menuIcon: {
                color: textColor
              },
              root: {
                backgroundColor: color.str,
                transition: this.animation
              },
              rootHovered: {
                backgroundColor: colorHover.str
              },
              rootPressed: {
                backgroundColor: colorPressed.str
              },
              rootExpanded: {
                backgroundColor: colorPressed.str
              }
            }}
          />
        </HoverCard>

        <Dialog
          hidden={!this.state.isDialogVisible}
          onDismiss={this._closeDialog}
          dialogContentProps={{
            type: DialogType.normal,
            title: 'Add a custom badge',
          }}
          modalProps={{
            isBlocking: false,
            styles: { main: { maxWidth: 450 } },
          }}
        >
          <Stack>
            <TextField
              placeholder="Badge Name"
              onChange={this._updateText} />
            <ColorPicker
              color={this.state.customColor}
              onChange={this._updateColor}
              alphaSliderHidden={true}
            />
          </Stack>
          <DialogFooter>
            <PrimaryButton onClick={this._onSave} text="Save" />
            <DefaultButton onClick={this._closeDialog} text="Cancel" />
          </DialogFooter>
        </Dialog>
      </div>
    )
  }
}