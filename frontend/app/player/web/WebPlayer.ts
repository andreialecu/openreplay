import { Log, LogLevel } from './types/log'
import { toast } from 'react-toastify';
import logger from 'App/logger';

import type { Store } from '../common/types'
import StorSubscriber from '../common/StoreSubscriber'
import Player from '../player/Player'

import MessageManager from './MessageManager'
import InspectorController from './addons/InspectorController'
import TargetMarker from './addons/TargetMarker'
import Screen, { ScaleMode } from './Screen/Screen'
import MessageLoader from './MessageLoader'


export default class WebPlayer extends Player {
  static readonly INITIAL_STATE = {
    ...Player.INITIAL_STATE,
    ...TargetMarker.INITIAL_STATE,
    ...MessageManager.INITIAL_STATE,

    ...MessageLoader.INITIAL_STATE,
  
    ready: true,
    inspectorMode: false,
  }

  private readonly inspectorController: InspectorController
  protected readonly screen: Screen
  protected readonly messageLoader: MessageLoader
  protected readonly messageManager: MessageManager

  private targetMarker: TargetMarker


  constructor(protected wpState: Store<typeof WebPlayer.INITIAL_STATE>, session: any, live: boolean, isClickMap = false) {
    let initialLists = live ? {} : {
      event: session.events || [],
      stack: session.stackEvents || [],
      exceptions: session.errors?.map(({ name, ...rest }: any) =>
        Log({
          level: LogLevel.ERROR,
          value: name,
          ...rest,
        })
      ) || [],
    }

    const store = new StorSubscriber(wpState)
    const screen = new Screen(session.isMobile, isClickMap ? ScaleMode.AdjustParentHeight : ScaleMode.Embed)
    const messageManager = new MessageManager(session, store, screen, initialLists)
    //TODO: same for scaling
    store.subscribe(state => state.cssLoading, cssLoading => this.screen.displayFrame(!cssLoading))
    store.subscribe(state => state.domLoading, domLoading => this.screen.display(!domLoading))
    store.subscribe(state => {
      const notReady = state.cssLoading || (state.domLoading && state.time >= state.lastMessageTime)
      return !notReady
    }, ready => store.update({ ready }))

    super(store, messageManager)
    this.screen = screen
    this.messageManager = messageManager
    this.messageLoader = new MessageLoader(session, wpState, messageManager.distributeMessage)

    if (!live) { // hack. TODO: split OfflinePlayer class
      this.messageLoader.loadDOM()
      .then(() => messageManager.onMessagesLoaded())
      .catch((e: any) => {
        logger.error(e)
        toast.error('Error requesting a session file') // TODO: outside of the player lib
      })
      this.messageLoader.loadDevtools()
      .then(() => messageManager.onMessagesLoaded())
      .catch(e => logger.error("Can not download the devtools file", e))
    }

    this.targetMarker = new TargetMarker(this.screen, wpState)
    this.inspectorController = new InspectorController(screen)


    const endTime = session.duration?.valueOf() || 0
    wpState.update({
      //@ts-ignore
      session,

      live,
      livePlay: live,
      endTime, // : 0,
    })

    // @ts-ignore
    window.playerJumpToTime = this.jump.bind(this)

  }

  attach = (parent: HTMLElement, isClickmap?: boolean) => {
    this.screen.attach(parent)
    if (!isClickmap) {
      window.addEventListener('resize', this.scale)
      this.scale()
    }
  }

  scale = () => {
    const { width, height } = this.wpState.get()
    this.screen.scale({ width, height })
    this.inspectorController.scale({ width, height })

    this.targetMarker.updateMarkedTargets()
  }

  // Inspector & marker
  mark(e: Element) {
    this.inspectorController.marker?.mark(e)
  }

  toggleInspectorMode = (flag: boolean, clickCallback?: Parameters<InspectorController['enableInspector']>[0]) => {
    if (typeof flag !== 'boolean') {
      const { inspectorMode } = this.wpState.get()
      flag = !inspectorMode
    }

    if (flag) {
      this.pause()
      this.wpState.update({ inspectorMode: true })
      return this.inspectorController.enableInspector(clickCallback)
    } else {
      this.inspectorController.disableInspector()
      this.wpState.update({ inspectorMode: false })
    }
  }

  // Target Marker
  setActiveTarget = (...args: Parameters<TargetMarker['setActiveTarget']>) => {
    this.targetMarker.setActiveTarget(...args)
  }

  markTargets = (...args: Parameters<TargetMarker['markTargets']>) => {
    this.pause()
    this.targetMarker.markTargets(...args)
  }

  showClickmap = (...args: Parameters<TargetMarker['injectTargets']>) => {
    this.screen.overlay.remove() // hack. TODO: 1.split Screen functionalities (overlay, mounter) 2. separate ClickMapPlayer class that does not create overlay
    this.freeze().then(() => {
      this.targetMarker.injectTargets(...args)
    })
  }

  toggleUserName = (name?: string) => {
    this.screen.cursor.showTag(name)
  }

  clean = () => {
    super.clean()
    this.messageManager.clean()
    window.removeEventListener('resize', this.scale)
  }
}
