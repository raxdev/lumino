# Changelog

## 2021-1-19

    @lumino/widgets@1.18.0
    @lumino/example-dockpanel@0.7.0
    @lumino/example-datastore@0.7.0
    @lumino/example-datagrid@0.16.0
    @lumino/default-theme@0.9.0
    @lumino/datagrid@0.19.0
    @lumino/application@1.15.0

- Allow passing of `tag` into `widget` constructor [#150](https://github.com/jupyterlab/lumino/pull/150) ([@telamonian](https://github.com/telamonian))
- Add checkbox aria role to toggleable commands [#149](https://github.com/jupyterlab/lumino/pull/149) ([@marthacryan](https://github.com/marthacryan))
- Remove leftover SectionResizeRequest [#148](https://github.com/jupyterlab/lumino/pull/148) ([@martinRenou](https://github.com/martinRenou))

## 2021-1-5

    @lumino/example-datagrid@0.15.0
    @lumino/datagrid@0.18.0

- DataGrid mouse handler: Expose pressData for subclasses [#146](https://github.com/jupyterlab/lumino/pull/146) ([@martinRenou](https://github.com/martinRenou))
- Make _repaintRegion a protected method [#145](https://github.com/jupyterlab/lumino/pull/145) ([@martinRenou](https://github.com/martinRenou))
- Bump ini from 1.3.5 to 1.3.7 [#143](https://github.com/jupyterlab/lumino/pull/143) ([@dependabot](https://github.com/dependabot))

## 2020-12-11

    @lumino/widgets@1.17.0
    @lumino/example-dockpanel@0.6.0
    @lumino/example-datastore@0.6.0
    @lumino/example-datagrid@0.14.0
    @lumino/default-theme@0.8.0
    @lumino/datagrid@0.17.0
    @lumino/application@1.14.0

- Switch to GitHub Actions [#142](https://github.com/jupyterlab/lumino/pull/142) ([@afshin](https://github.com/afshin))
- Add text wrapping [#140](https://github.com/jupyterlab/lumino/pull/140) ([@ibdafna](https://github.com/ibdafna))
- Constrain tabs to their source DockPanel (opt-in) [#137](https://github.com/jupyterlab/lumino/pull/137) ([@piersdeseilligny](https://github.com/piersdeseilligny))

## 2020-12-3

    @lumino/widgets@1.16.1
    @lumino/example-dockpanel@0.5.1
    @lumino/example-datastore@0.5.1
    @lumino/example-datagrid@0.13.1
    @lumino/dragdrop@1.7.1
    @lumino/default-theme@0.7.1
    @lumino/datagrid@0.16.1
    @lumino/application@1.13.1

- Specify the CSS javascript module imports explicitly in package.json. [#139](https://github.com/jupyterlab/lumino/pull/139) ([@jasongrout](https://github.com/jasongrout))

## 2020-12-1

    @lumino/widgets@1.16.0
    @lumino/example-dockpanel@0.5.0
    @lumino/example-datastore@0.5.0
    @lumino/example-datagrid@0.13.0
    @lumino/dragdrop@1.7.0
    @lumino/default-theme@0.7.0
    @lumino/datagrid@0.16.0
    @lumino/application@1.13.0

- Add style index.js files to optionally consume the CSS via a js module import [#136](https://github.com/jupyterlab/lumino/pull/136) ([@jasongrout](https://github.com/jasongrout))

## 2020-11-30

    @lumino/widgets@1.15.0
    @lumino/virtualdom@1.8.0
    @lumino/example-dockpanel@0.4.0
    @lumino/example-datastore@0.4.0
    @lumino/example-datagrid@0.12.0
    @lumino/default-theme@0.6.0
    @lumino/datagrid@0.15.0
    @lumino/commands@1.12.0
    @lumino/application@1.12.0

- Bump highlight.js from 9.17.1 to 9.18.5 [#135](https://github.com/jupyterlab/lumino/pull/135) ([@dependabot](https://github.com/dependabot))
- Batch Add Items to Command Pallette [#133](https://github.com/jupyterlab/lumino/pull/133) ([@jhamet93](https://github.com/jhamet93))
- Add aria roles to menus [#131](https://github.com/jupyterlab/lumino/pull/131) ([@marthacryan](https://github.com/marthacryan))
- Add isToggleable command state [#129](https://github.com/jupyterlab/lumino/pull/129) ([@marthacryan](https://github.com/marthacryan))

## 2020-11-2

    @lumino/widgets@1.14.1
    @lumino/example-dockpanel@0.3.6
    @lumino/example-datastore@0.3.6
    @lumino/example-datagrid@0.11.1
    @lumino/default-theme@0.5.1
    @lumino/datagrid@0.14.1
    @lumino/commands@1.11.4
    @lumino/application@1.11.1

- Fix sluggish tab dragging in the tab bar. [#128](https://github.com/jupyterlab/lumino/pull/128) ([@subhav](https://github.com/subhav))
- Improve note about performance of commandExecuted handlers. [#127](https://github.com/jupyterlab/lumino/pull/127) ([@ellisonbg](https://github.com/ellisonbg))
- Bump node-fetch from 2.6.0 to 2.6.1 [#121](https://github.com/jupyterlab/lumino/pull/121) ([@dependabot](https://github.com/dependabot))
- Bump http-proxy from 1.18.0 to 1.18.1 [#120](https://github.com/jupyterlab/lumino/pull/120) ([@dependabot](https://github.com/dependabot))

## 2020-8-24

    @lumino/example-datagrid@0.11.0
    @lumino/datagrid@0.14.0

- Make private _drawCornerHeaderRegion protected drawCornerHeaderRegion [#116](https://github.com/jupyterlab/lumino/pull/116) ([@lmcnichols](https://github.com/lmcnichols))
- Text eliding with ellipsis on datagrid text renderer [#105](https://github.com/jupyterlab/lumino/pull/105) ([@nmichaud](https://github.com/nmichaud))

## 2020-8-20

    @lumino/widgets@1.14.0
    @lumino/example-dockpanel@0.3.5
    @lumino/example-datastore@0.3.5
    @lumino/example-datagrid@0.10.0
    @lumino/default-theme@0.5.0
    @lumino/datastore@0.11.0
    @lumino/datagrid@0.13.0
    @lumino/application@1.11.0

- mouseDown now uses cell, column, and row selection modes [#114](https://github.com/jupyterlab/lumino/pull/114) ([@kgoo124](https://github.com/kgoo124))
- Double-click to edit tab title in TabBars [#112](https://github.com/jupyterlab/lumino/pull/112) ([@nmichaud](https://github.com/nmichaud))
- Give extending classes access to some of the data grid's paint utilities. [#111](https://github.com/jupyterlab/lumino/pull/111) ([@lmcnichols](https://github.com/lmcnichols))
- Fix for DockPanel.tabsMovable to set false to all tabs [#109](https://github.com/jupyterlab/lumino/pull/109) ([@nmichaud](https://github.com/nmichaud))
- Modified function spliceArray in datastore/src/listfield.ts so that it behaves like Array.splice on large inputs. [#101](https://github.com/jupyterlab/lumino/pull/101) ([@lmcnichols](https://github.com/lmcnichols))
- Bump elliptic from 6.5.2 to 6.5.3 [#99](https://github.com/jupyterlab/lumino/pull/99) ([@dependabot](https://github.com/dependabot))

## 2020-7-27

    @lumino/widgets@1.13.4
    @lumino/example-dockpanel@0.3.4
    @lumino/example-datastore@0.3.4
    @lumino/example-datagrid@0.9.0
    @lumino/dragdrop@1.6.4
    @lumino/default-theme@0.4.4
    @lumino/datagrid@0.12.0
    @lumino/application@1.10.4

- Change the Drag class's private method _moveDragImage to a public method moveDragImage. [#96](https://github.com/jupyterlab/lumino/pull/96) ([@lmcnichols](https://github.com/lmcnichols))

## 2020-7-21

    @lumino/widgets@1.13.3
    @lumino/virtualdom@1.7.3
    @lumino/signaling@1.4.3
    @lumino/properties@1.2.3
    @lumino/polling@1.3.3
    @lumino/messaging@1.4.3
    @lumino/keyboard@1.2.3
    @lumino/example-dockpanel@0.3.3
    @lumino/example-datastore@0.3.3
    @lumino/example-datagrid@0.8.1
    @lumino/dragdrop@1.6.3
    @lumino/domutils@1.2.3
    @lumino/disposable@1.4.3
    @lumino/default-theme@0.4.3
    @lumino/datastore@0.10.3
    @lumino/datagrid@0.11.1
    @lumino/coreutils@1.5.3
    @lumino/commands@1.11.3
    @lumino/collections@1.3.3
    @lumino/application@1.10.3
    @lumino/algorithm@1.3.3

- Have the DataGrid syncViewport when receiving a DataModel.ChangedArgs signal of type "rows-moved" or "columns-moved" [#94](https://github.com/jupyterlab/lumino/pull/94) ([@lmcnichols](https://github.com/lmcnichols))

## 2020-7-21

    @lumino/example-datagrid@0.8.0
    @lumino/datagrid@0.11.0

- Make cursorForHandle and it's argument type accessible from outside BasicMouseHandler. [#92](https://github.com/jupyterlab/lumino/pull/92) ([@lmcnichols](https://github.com/lmcnichols))
- Bump lodash from 4.17.15 to 4.17.19 [#90](https://github.com/jupyterlab/lumino/pull/90) ([@dependabot](https://github.com/dependabot))

## 2020-7-5

    @lumino/example-datagrid@0.7.0
    @lumino/datagrid@0.10.0

- CellEditors now render in front of the DataGrid [#87](https://github.com/jupyterlab/lumino/pull/87) ([@kgoo124](https://github.com/kgoo124))

## 2020-6-26

    @lumino/widgets@1.13.2
    @lumino/virtualdom@1.7.2
    @lumino/signaling@1.4.2
    @lumino/properties@1.2.2
    @lumino/polling@1.3.2
    @lumino/messaging@1.4.2
    @lumino/keyboard@1.2.2
    @lumino/example-dockpanel@0.3.2
    @lumino/example-datastore@0.3.2
    @lumino/example-datagrid@0.6.1
    @lumino/dragdrop@1.6.2
    @lumino/domutils@1.2.2
    @lumino/disposable@1.4.2
    @lumino/default-theme@0.4.2
    @lumino/datastore@0.10.2
    @lumino/datagrid@0.9.1
    @lumino/coreutils@1.5.2
    @lumino/commands@1.11.2
    @lumino/collections@1.3.2
    @lumino/application@1.10.2
    @lumino/algorithm@1.3.2

- Revert "chore(build): Bump Typescript to 3.9.2" [#84](https://github.com/jupyterlab/lumino/pull/84) ([@telamonian](https://github.com/telamonian))

## 2020-6-24

    @lumino/widgets@1.13.1
    @lumino/virtualdom@1.7.1
    @lumino/signaling@1.4.1
    @lumino/properties@1.2.1
    @lumino/polling@1.3.1
    @lumino/messaging@1.4.1
    @lumino/keyboard@1.2.1
    @lumino/example-dockpanel@0.3.1
    @lumino/example-datastore@0.3.1
    @lumino/example-datagrid@0.6.0
    @lumino/dragdrop@1.6.1
    @lumino/domutils@1.2.1
    @lumino/disposable@1.4.1
    @lumino/default-theme@0.4.1
    @lumino/datastore@0.10.1
    @lumino/datagrid@0.9.0
    @lumino/coreutils@1.5.1
    @lumino/commands@1.11.1
    @lumino/collections@1.3.1
    @lumino/application@1.10.1
    @lumino/algorithm@1.3.1

- fix columnCount signature [#82](https://github.com/jupyterlab/lumino/pull/82) ([@mbektasbbg](https://github.com/mbektasbbg))
- unsubscribe from grid wheel events on editor dispose [#80](https://github.com/jupyterlab/lumino/pull/80) ([@mbektasbbg](https://github.com/mbektasbbg))
- chore(build): Bump Typescript to 3.9.2 [#75](https://github.com/jupyterlab/lumino/pull/75) ([@GordonSmith](https://github.com/GordonSmith))

## 2020-5-23

    @lumino/widgets@1.13.0-alpha.0
    @lumino/virtualdom@1.7.0-alpha.0
    @lumino/signaling@1.4.0-alpha.0
    @lumino/properties@1.2.0-alpha.0
    @lumino/polling@1.3.0-alpha.0
    @lumino/messaging@1.4.0-alpha.0
    @lumino/keyboard@1.2.0-alpha.0
    @lumino/example-dockpanel@0.3.0-alpha.0
    @lumino/example-dockpanel-iife@0.1.0-alpha.0
    @lumino/example-dockpanel-amd@0.1.0-alpha.0
    @lumino/example-datastore@0.3.0-alpha.0
    @lumino/example-datagrid@0.5.0-alpha.0
    @lumino/dragdrop@1.6.0-alpha.0
    @lumino/domutils@1.2.0-alpha.0
    @lumino/disposable@1.4.0-alpha.0
    @lumino/default-theme@0.4.0-alpha.0
    @lumino/datastore@0.10.0-alpha.0
    @lumino/datagrid@0.8.0-alpha.0
    @lumino/coreutils@1.5.0-alpha.0
    @lumino/commands@1.11.0-alpha.0
    @lumino/collections@1.3.0-alpha.0
    @lumino/application@1.10.0-alpha.0
    @lumino/algorithm@1.3.0-alpha.0

- Added type search to command pallet search input [#57](https://github.com/jupyterlab/lumino/pull/57) ([@ggbhat](https://github.com/ggbhat))
- feat(build): Add UMD support [#40](https://github.com/jupyterlab/lumino/pull/40) ([@GordonSmith](https://github.com/GordonSmith))

## 2020-5-12

    @lumino/widgets@1.12.2
    @lumino/signaling@1.3.6
    @lumino/polling@1.2.2
    @lumino/example-dockpanel@0.2.2
    @lumino/example-datastore@0.2.13
    @lumino/example-datagrid@0.4.2
    @lumino/dragdrop@1.5.3
    @lumino/disposable@1.3.6
    @lumino/default-theme@0.3.2
    @lumino/datastore@0.9.2
    @lumino/datagrid@0.7.2
    @lumino/commands@1.10.3
    @lumino/application@1.9.2

- Fix `disconnectAll` implementation. [#71](https://github.com/jupyterlab/lumino/pull/71) ([@AlbertHilb](https://github.com/AlbertHilb))

## 2020-5-7

    @lumino/widgets@1.12.1
    @lumino/polling@1.2.1
    @lumino/example-dockpanel@0.2.1
    @lumino/example-datastore@0.2.12
    @lumino/example-datagrid@0.4.1
    @lumino/dragdrop@1.5.2
    @lumino/default-theme@0.3.1
    @lumino/datastore@0.9.1
    @lumino/datagrid@0.7.1
    @lumino/coreutils@1.4.3
    @lumino/commands@1.10.2
    @lumino/application@1.9.1

- Tell bundlers to not package a crypto module for the browser. [#70](https://github.com/jupyterlab/lumino/pull/70) ([@jasongrout](https://github.com/jasongrout))
- Fix boolean logic when false is specified [#69](https://github.com/jupyterlab/lumino/pull/69) ([@nmichaud](https://github.com/nmichaud))
- Bump jquery from 3.4.1 to 3.5.0 [#68](https://github.com/jupyterlab/lumino/pull/68) ([@dependabot](https://github.com/dependabot))
- Fix namespacing for 'invalid' classname [#67](https://github.com/jupyterlab/lumino/pull/67) ([@nmichaud](https://github.com/nmichaud))

## 2020-4-24

    @lumino/widgets@1.12.0
    @lumino/polling@1.2.0
    @lumino/example-dockpanel@0.2.0
    @lumino/example-datastore@0.2.11
    @lumino/example-datagrid@0.4.0
    @lumino/default-theme@0.3.0
    @lumino/datagrid@0.7.0
    @lumino/application@1.9.0

- Fixes tabsMovable on DockPanel [#66](https://github.com/jupyterlab/lumino/pull/66) ([@nmichaud](https://github.com/nmichaud))
- Customize minimum row and column section sizes for datagrid [#65](https://github.com/jupyterlab/lumino/pull/65) ([@nmichaud](https://github.com/nmichaud))

## 2020-3-22

    @lumino/polling@1.1.0
    @lumino/example-datastore@0.2.10
    @lumino/example-datagrid@0.3.4
    @lumino/datastore@0.9.0
    @lumino/datagrid@0.6.0

## 2020-2-19

    @lumino/widgets@1.11.1
    @lumino/virtualdom@1.6.1
    @lumino/signaling@1.3.5
    @lumino/polling@1.0.4
    @lumino/example-dockpanel@0.1.31
    @lumino/example-datastore@0.2.9
    @lumino/example-datagrid@0.3.3
    @lumino/dragdrop@1.5.1
    @lumino/disposable@1.3.5
    @lumino/default-theme@0.2.4
    @lumino/datastore@0.8.4
    @lumino/datagrid@0.5.3
    @lumino/commands@1.10.1
    @lumino/application@1.8.4

- Yet another fix for vdom nodes with custom renderers [#53](https://github.com/jupyterlab/lumino/pull/53) ([@telamonian](https://github.com/telamonian))
- Fix names for poll tests. [#50](https://github.com/jupyterlab/lumino/pull/50) ([@afshin](https://github.com/afshin))
- Fix broken links in polling package and signaling tests. [#49](https://github.com/jupyterlab/lumino/pull/49) ([@afshin](https://github.com/afshin))

## 2020-2-10

    @lumino/widgets@1.11.0
    @lumino/virtualdom@1.6.0
    @lumino/example-dockpanel@0.1.30
    @lumino/example-datastore@0.2.8
    @lumino/example-datagrid@0.3.2
    @lumino/default-theme@0.2.3
    @lumino/datagrid@0.5.2
    @lumino/commands@1.10.0
    @lumino/application@1.8.3

- IRenderer cleanup; normalize icon fields across all interfaces [#46](https://github.com/jupyterlab/lumino/pull/46) ([@telamonian](https://github.com/telamonian))

## 2020-1-27

    @lumino/widgets@1.10.2
    @lumino/virtualdom@1.5.0
    @lumino/example-dockpanel@0.1.29
    @lumino/example-datastore@0.2.7
    @lumino/example-datagrid@0.3.1
    @lumino/default-theme@0.2.2
    @lumino/datagrid@0.5.1
    @lumino/application@1.8.2

- Simplified/improved custom rendering of virtual nodes: removed `hpass` and `VirtualElementPass`, added optional `renderer` param [#44](https://github.com/jupyterlab/lumino/pull/44) ([@telamonian](https://github.com/telamonian))

## 2020-1-24

    @lumino/widgets@1.10.1
    @lumino/virtualdom@1.4.1
    @lumino/example-dockpanel@0.1.28
    @lumino/example-datastore@0.2.6
    @lumino/example-datagrid@0.3.0
    @lumino/default-theme@0.2.1
    @lumino/datagrid@0.5.0
    @lumino/application@1.8.1

- Remove 'sourceMap' from tsconfig in `@lumino/virtualdom` [#41](https://github.com/jupyterlab/lumino/pull/41) ([@zemeolotu](https://github.com/zemeolotu))
- Start a change log [#38](https://github.com/jupyterlab/lumino/pull/38) ([@blink1073](https://github.com/blink1073))
- DataGrid Cell Editing [#14](https://github.com/jupyterlab/lumino/pull/14) ([@mbektasbbg](https://github.com/mbektasbbg))

## 2020-1-8

    @lumino/widgets@1.10.0
    @lumino/example-dockpanel@0.1.27
    @lumino/example-datastore@0.2.5
    @lumino/example-datagrid@0.2.6
    @lumino/dragdrop@1.5.0
    @lumino/default-theme@0.2.0
    @lumino/datagrid@0.4.0
    @lumino/commands@1.9.2
    @lumino/application@1.8.0

- Update selector, data attribute, and event namespaces. [#20](https://github.com/jupyterlab/lumino/pull/20) ([@afshin](https://github.com/afshin))

## 2020-1-2

    @lumino/widgets@1.9.7
    @lumino/virtualdom@1.4.0
    @lumino/signaling@1.3.4
    @lumino/properties@1.1.6
    @lumino/polling@1.0.3
    @lumino/messaging@1.3.3
    @lumino/keyboard@1.1.6
    @lumino/example-dockpanel@0.1.26
    @lumino/example-datastore@0.2.4
    @lumino/example-datagrid@0.2.5
    @lumino/dragdrop@1.4.4
    @lumino/domutils@1.1.7
    @lumino/disposable@1.3.4
    @lumino/default-theme@0.1.12
    @lumino/datastore@0.8.3
    @lumino/datagrid@0.3.5
    @lumino/coreutils@1.4.2
    @lumino/commands@1.9.1
    @lumino/collections@1.2.3
    @lumino/application@1.7.7
    @lumino/algorithm@1.2.3

- Improve handling of attributes for hpass virtualdom elements [#36](https://github.com/jupyterlab/lumino/pull/36) ([@telamonian](https://github.com/telamonian))
- Fix `output.path` for webpack 4 [#35](https://github.com/jupyterlab/lumino/pull/35) ([@telamonian](https://github.com/telamonian))

## 2019-12-19

    @lumino/widgets@1.9.6
    @lumino/example-dockpanel@0.1.25
    @lumino/example-datastore@0.2.3
    @lumino/example-datagrid@0.2.4
    @lumino/default-theme@0.1.11
    @lumino/datagrid@0.3.4
    @lumino/commands@1.9.0
    @lumino/application@1.7.6

- Allow commands to accept partial json objects [#32](https://github.com/jupyterlab/lumino/pull/32) ([@blink1073](https://github.com/blink1073))

## 2019-12-17

    @lumino/widgets@1.9.5
    @lumino/virtualdom@1.3.0
    @lumino/signaling@1.3.3
    @lumino/properties@1.1.5
    @lumino/polling@1.0.2
    @lumino/messaging@1.3.2
    @lumino/keyboard@1.1.5
    @lumino/example-dockpanel@0.1.24
    @lumino/example-datastore@0.2.2
    @lumino/example-datagrid@0.2.3
    @lumino/dragdrop@1.4.3
    @lumino/domutils@1.1.6
    @lumino/disposable@1.3.3
    @lumino/default-theme@0.1.10
    @lumino/datastore@0.8.2
    @lumino/datagrid@0.3.3
    @lumino/coreutils@1.4.1
    @lumino/commands@1.8.1
    @lumino/collections@1.2.2
    @lumino/application@1.7.5
    @lumino/algorithm@1.2.2

- Update dependencies [#31](https://github.com/jupyterlab/lumino/pull/31) ([@blink1073](https://github.com/blink1073))
- Use the standby value generated instead of ignoring it. [#30](https://github.com/jupyterlab/lumino/pull/30) ([@jasongrout](https://github.com/jasongrout))
- Adds a "pass thru" virtual element [#29](https://github.com/jupyterlab/lumino/pull/29) ([@telamonian](https://github.com/telamonian))
- Update API reports [#28](https://github.com/jupyterlab/lumino/pull/28) ([@vidartf](https://github.com/vidartf))
- chore(build): Bump typescript to version 3.6.4 [#27](https://github.com/jupyterlab/lumino/pull/27) ([@GordonSmith](https://github.com/GordonSmith))
- chore(build): Add missing package.json dependencies [#24](https://github.com/jupyterlab/lumino/pull/24) ([@GordonSmith](https://github.com/GordonSmith))
- Enable / disable runtime tab dragging in DockPanel [#23](https://github.com/jupyterlab/lumino/pull/23) ([@GordonSmith](https://github.com/GordonSmith))